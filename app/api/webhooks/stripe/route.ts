import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { failedInvoices, users } from "@/db/schema";
import { stripe } from "@/lib/stripe/client";
import { publishRecoverySequence } from "@/lib/qstash/client";
import type { StripeWebhookResponse } from "@/lib/stripe/types";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<StripeWebhookResponse>> {
  const body: string = await req.text();
  const headersList = await headers();
  const signature: string | null = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { received: false, error: "Missing signature or secret configuration" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Signature validation error";
    return NextResponse.json(
      { received: false, error: `Webhook Signature Failed: ${errorMessage}` },
      { status: 400 }
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

      if (!customerEmail || !stripeCustomerId) {
        break;
      }

      // Lookup targeted user account or fallback to active tenant
      const targetAccount = event.account ?? "";

      const [userWithAccount] = await db
            .select()
            .from(users)
            .where(eq(users.stripeAccountId, targetAccount))
            .limit(1);

      let targetUser = userWithAccount; 

      if (!targetUser) {
        const [firstUser] = await db.select().from(users).limit(1);
        targetUser = firstUser
      }

      if (!targetUser) {
        return NextResponse.json(
          { received: false, error: "No target user found" },
          { status: 422 }
        );
      }

      // Atomic Upsert
      const [record] = await db
        .insert(failedInvoices)
        .values({
          userId: targetUser.id,
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
            status: "pending", // Reset status if retried
            hostedInvoiceUrl,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Enqueue 3-step sequence in QStash
      await publishRecoverySequence({
        failedInvoiceId: record.id,
        stripeInvoiceId,
        customerEmail,
        customerPhone: invoice.customer_phone ?? null,
        customerName: invoice.customer_name ?? null,
        amountDue,
        currency,
        hostedInvoiceUrl,
      });

      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;

      // Update DB state to 'recovered' — this automatically aborts future QStash jobs
      await db
        .update(failedInvoices)
        .set({
          status: "recovered",
          updatedAt: new Date(),
        })
        .where(eq(failedInvoices.stripeInvoiceId, invoice.id));

      console.log(`[Stripe Webhook]: Marked invoice ${invoice.id} RECOVERED. Active dunning stopped.`);
      break;
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}