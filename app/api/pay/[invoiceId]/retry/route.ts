import { NextResponse } from "next/server";
import {db} from "@/db";
import {users, recoveryLogs, failedInvoices} from "@/db/schema";
import { stripe } from "@/lib/stripe/client";
import { verifyPaymentAccessToken } from "@/lib/stripe/payment-access";
import {eq} from "drizzle-orm";

export async function POST(req: Request, {params}: {params: Promise<{invoiceId: string}>}) {
    try {
        const { invoiceId } = await params;
        const { paymentMethodId, token } = await req.json();

        if (!verifyPaymentAccessToken(invoiceId, token)) {
          return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 401 });
        }

        if(!paymentMethodId) {
            return NextResponse.json({error: "Payment method ID required"}, {status: 400});
        }

        const [invoice] = await db
          .select()
          .from(failedInvoices)
          .where(eq(failedInvoices.id, invoiceId))
          .limit(1);

        if(!invoice) {
            return NextResponse.json({error: "Invoice not found"}, {status: 404});
        }
        
        const [merchant] = await db
          .select()
          .from(users)
          .where(eq(users.id, invoice.userId))
          .limit(1);

        if(!merchant || !merchant.stripeAccountId) {
            return NextResponse.json({error: "Merchant Stripe connection not found"}, {status: 500})
        }
        const stripeOptions = {stripeAccount: merchant.stripeAccountId}

        //1. Attach payment method to customer
        await stripe.paymentMethods.attach(
            paymentMethodId,
            {customer: invoice.stripeCustomerId}, 
            stripeOptions
        );

        //2. Set as customer's default payment method
        await stripe.customers.update(
            invoice.stripeCustomerId, 
          {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
          },
          stripeOptions
        );

        //3. Re-pay the failed invoice
        const paidInvoice = await stripe.invoices.pay(
            invoice.stripeInvoiceId,
            {payment_method: paymentMethodId},
            stripeOptions
        );

        if(paidInvoice.status === "paid") {
            //4. Update local DB status to recovered
            await db
              .update(failedInvoices)
              .set({
                status: "recovered",
                updatedAt: new Date()
              })
              .where(eq(failedInvoices.id, invoice.id));

              //5. Log recovery in audit timeline
              await db.insert(recoveryLogs).values({
                failedInvoiceId: invoice.id,
                channel: "email",
                status: "delivered",
                payloadMessageId: `self_service_payment_${paidInvoice.id}`,
                sentAt: new Date(),
              });

              return NextResponse.json({success: true, status: "paid"});
        } else {
            return NextResponse.json(
                {error: "Payment attempt failed, Please try another card."},
                {status: 400}
            )
        }
    } catch(error) {
        console.error(error);
        return NextResponse.json({error: "Internal server error"}, {status: 500});
    }
}