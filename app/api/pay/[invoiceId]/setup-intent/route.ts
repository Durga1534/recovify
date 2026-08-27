import { NextResponse } from "next/server";
import { db } from "@/db";
import { dunningSettings, failedInvoices, users } from "@/db/schema";
import { stripe } from "@/lib/stripe/client";
import { verifyPaymentAccessToken } from "@/lib/stripe/payment-access";
import { eq } from "drizzle-orm";

export async function POST(req: Request,{ params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const token = new URL(req.url).searchParams.get("token");

    if (!verifyPaymentAccessToken(invoiceId, token)) {
      return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 401 });
    }

    // 1. Fetch the invoice (unauthenticated for customer portal access)
    const [invoice] = await db
      .select()
      .from(failedInvoices)
      .where(eq(failedInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "recovered") {
      return NextResponse.json(
        { error: "This invoice has already been recovered.", status: "recovered" },
        { status: 400 }
      );
    }

    // 2. Fetch the tenant user to retrieve their Stripe access token
    const [merchant] = await db
      .select()
      .from(users)
      .where(eq(users.id, invoice.userId))
      .limit(1);

    if (!merchant?.stripeAccountId) {
      return NextResponse.json(
        { error: "Merchant Stripe connection not found" },
        { status: 500 }
      );
    }

    const [settings] = await db
      .select({ companyName: dunningSettings.companyName })
      .from(dunningSettings)
      .where(eq(dunningSettings.userId, merchant.id))
      .limit(1);

    // 4. Create SetupIntent on the connected Stripe account
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: invoice.stripeCustomerId,
        payment_method_types: ["card"],
        metadata: {
          invoiceId: invoice.id,
          stripeInvoiceId: invoice.stripeInvoiceId,
        },
      },
      {
        stripeAccount: merchant.stripeAccountId!,
      }
    );

    const amountFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency.toUpperCase(),
    }).format(invoice.amountDue / 100);

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      stripeAccountId: merchant.stripeAccountId,
      customerName: invoice.customerName || "Customer",
      customerEmail: invoice.customerEmail,
      amountFormatted,
      companyName: settings?.companyName || "Our Service",
    });
  } catch (error: unknown) {
    console.error("[SetupIntent Creation Error]:", error);
    const message = error instanceof Error ? error.message : "Failed to create setup session";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}