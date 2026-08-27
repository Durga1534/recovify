import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { db } from "@/db";
import { failedInvoices, recoveryLogs } from "@/db/schema";
import { sendDunningEmail } from "@/lib/email/resend";
import { sendWhatsAppDunningMessage } from "@/lib/twilio";
import type { QStashWorkerResponse, RecoveryJobPayload } from "@/lib/qstash/types";
import { eq } from "drizzle-orm";
import { createPaymentAccessToken } from "@/lib/stripe/payment-access";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<QStashWorkerResponse>> {
  const bodyText = await req.text();
  const signature = req.headers.get("upstash-signature");

  if (process.env.NODE_ENV === "production") {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });

    const isValid = await receiver.verify({
      body: bodyText,
      signature: signature ?? "",
    }).catch(() => false);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid QStash signature" },
        { status: 401 }
      );
    }
  }

  const payload = JSON.parse(bodyText) as RecoveryJobPayload;

  // 1. Fetch live status from database
  const [invoice] = await db
       .select()
       .from(failedInvoices)
       .where(eq(failedInvoices.id, payload.failedInvoiceId))
       .limit(1);
        
  // 2. Cancellation Guard: If invoice is recovered or missing, abort execution
  if (!invoice || invoice.status === "recovered") {
    console.log(`[QStash Worker Guard]: Aborted step ${payload.step} for ${payload.stripeInvoiceId} - Invoice already recovered.`);
    return NextResponse.json(
      { success: true, message: `Skipped step ${payload.step} - Invoice recovered` },
      { status: 200 }
    );
  }

  const paymentLink = invoice.hostedInvoiceUrl || `${getAppUrl()}/pay/${invoice.id}?token=${createPaymentAccessToken(invoice.id)}`;
  let messageId: string | null = null;
  let channel: "email" | "whatsapp" = "email";

  // 3. Dispatch sequence based on step definition
  if (payload.step === 2 && payload.customerPhone) {
    channel = "whatsapp";
    const result = await sendWhatsAppDunningMessage({
      toPhone: payload.customerPhone,
      customerName: invoice.customerName,
      amountDue: invoice.amountDue,
      currency: invoice.currency,
      paymentLink,
    });
    messageId = result.sid;
  } else {
    channel = "email";
    const result = await sendDunningEmail({
      userId: invoice.userId,
      to: invoice.customerEmail,
      customerName: invoice.customerName,
      amountDue: invoice.amountDue,
      currency: invoice.currency,
      paymentLink,
    });
    messageId = result.id;
  }

  // 4. Audit Log Entry
  await db.insert(recoveryLogs).values({
    failedInvoiceId: invoice.id,
    channel,
    status: messageId ? "sent" : "failed",
    payloadMessageId: messageId,
  });

  return NextResponse.json(
    { success: true, message: `Step ${payload.step} executed via ${channel}` },
    { status: 200 }
  );
}