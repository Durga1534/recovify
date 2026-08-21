import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { failedInvoices, users } from "@/db/schema";
import { qstashClient } from "@/lib/qstash/client";
import { stripe } from "@/lib/stripe/client";
import type { StripeWebhookResponse } from "@/lib/stripe/types";
import type { RecoveryJobPayload } from "@/lib/qstash/types";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<StripeWebhookResponse>> {
    const body: string = await req.text();
    const headersList = await headers();
    const signature: string | null = headersList.get("stripe-signature");

    if(!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json(
            {received: false, error: "Missing signature or webhook secret configuration"},
            {status: 400}
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    }catch(err) {
        const errorMessage = err instanceof Error ? err.message: "Unknown signature validation error";
        return NextResponse.json(
            {received: false, error: `Webhook Signature Verification Failed: ${errorMessage}`},
            {status: 400}
        );
    }

    switch (event.type) {
        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            
            const stripeCustomerId: string =
               typeof invoice.customer === "string"
                 ? invoice.customer
                 : invoice.customer?.id ?? "";

            const customerEmail: string = invoice.customer_email ?? "";
            const stripeInvoiceId: string = invoice.id;
            const amountDue: number = invoice.amount_due;
            const currency: string = invoice.currency;
            const hostedInvoiceUrl: string | null = invoice.hosted_invoice_url ?? null;

            if(!customerEmail || !stripeCustomerId) {
                return NextResponse.json(
                    {received: false, error: `Invoice ${stripeInvoiceId} is missing customer email or ID`},
                    {status: 422}
                );
            }

            //1. Locate the SaaS founder registered on our platform
            const targetAccount = event.account ?? "";
                        const [targetUser] = await db
                            .select()
                            .from(users)
                            .where(eq(users.stripeAccountId, targetAccount))
                            .limit(1);

            // Fallback for single-tenant local dev testing if user account sync is pending
                        const [defaultUser] = targetUser
                                        ? [targetUser]
                                        : process.env.NODE_ENV !== "production"
                                            ? await db.select().from(users).limit(1)
                                            : [];

            if(!defaultUser) {
                return NextResponse.json(
                    {received: false, error: "No registered user found for target Stripe account"},
                    {status: 422}
                            );
            }

            //2. Atomic Upset into Neon DB
            await db
              .insert(failedInvoices)
              .values({
                userId: defaultUser.id,
                stripeInvoiceId,
                stripeCustomerId,
                customerEmail,
                customerName: invoice.customer_name ?? null,
                customerPhone: invoice.customer_phone ?? null,
                amountDue,
                currency,
                status: "pending",
                hostedInvoiceUrl,
              })
              .onConflictDoUpdate({
                target: failedInvoices.stripeInvoiceId,
                set: {
                    amountDue,
                    hostedInvoiceUrl,
                    updatedAt: new Date(),
                }
              });

            const [storedInvoice] = await db
              .select()
              .from(failedInvoices)
              .where(eq(failedInvoices.stripeInvoiceId, stripeInvoiceId))
              .limit(1);

            if (!storedInvoice) {
                return NextResponse.json(
                    {received: false, error: "Failed to load the stored invoice for recovery scheduling"},
                    {status: 500}
                );
            }

            const recoveryJob: RecoveryJobPayload = {
                failedInvoiceId: storedInvoice.id,
                stripeInvoiceId: storedInvoice.stripeInvoiceId,
                customerEmail: storedInvoice.customerEmail,
                customerPhone: storedInvoice.customerPhone,
                customerName: storedInvoice.customerName,
                amountDue: storedInvoice.amountDue,
                currency: storedInvoice.currency,
                hostedInvoiceUrl: storedInvoice.hostedInvoiceUrl,
                step: 1,
            };

            await qstashClient.publishJSON({
                url: `${process.env.NEXT_PUBLIC_APP_URL}/api/qstash/recovery-worker`,
                body: recoveryJob,
                retries: 3,
            });

              console.log(`[Stripe Webhook Success]: Logged failed invoice ${stripeInvoiceId} ($${amountDue / 100})`);
              break;
        }

        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;

            // Automatically update status to 'recovered' when card is updated and charge success
            await db
              .update(failedInvoices)
              .set({
                status: "recovered",
                updatedAt: new Date(),
              })
              .where(eq(failedInvoices.stripeInvoiceId, invoice.id));

              console.log(`[Stripe Webhook Success]: Marked invoice ${invoice.id} as RECOVERED`);
              break;
        }

        default:
            console.log(`[Stripe Webhook Notice]: Unhandled event type received: ${event.type}`);
    }
    return NextResponse.json({received: true}, {status: 200});
}