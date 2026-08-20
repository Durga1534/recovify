import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import {db} from "@/db";
import {failedInvoices, recoveryLogs} from "@/db/schema";
import { sendDunningEmail } from "@/lib/email/resend";
import { sendWhatsAppDunning } from "@/lib/whatsapp/twilio";
import type { QStashWorkerResponse, RecoveryJobPayload } from "@/lib/qstash/types";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<QStashWorkerResponse>> {
    const bodyText = await req.text();
    const signature = req.headers.get("upstash-signature");

    //1. Verify Request Authenticity from Upstash Qstash
    if (process.env.NODE_ENV === "production") {
        const receiver = new Receiver({
            currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
            nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
        });

        const isValid = await receiver.verify({
            body: bodyText,
            signature: signature ?? "",
        }).catch(() => false);

        if(!isValid) {
            return NextResponse.json(
                {success: false, message: "Invalid QStash signature"},
                {status: 401}
            )
        }
    }

    let payload: RecoveryJobPayload;
    try {
        payload = JSON.parse(bodyText) as RecoveryJobPayload;
    } catch {
        return NextResponse.json(
            {success: false, message: "Invalid JSON payload"},
            {status: 400}
        );
    }

    if (
        typeof payload.failedInvoiceId !== "string" ||
        ![1, 2, 3].includes(payload.step)
    ) {
        return NextResponse.json(
            {success: false, message: "Invalid recovery job payload"},
            {status: 400}
        );
    }

    //2. Check if invoice was already paid/recovered before sending reminders
    const [invoice] = await db
        .select()
        .from(failedInvoices)
        .where(eq(failedInvoices.id, payload.failedInvoiceId))
        .limit(1);

    if(!invoice || invoice.status === "recovered") {
        return NextResponse.json(
            {success: true, message: "Skipped - Invoice already recovered"},
            {status: 200}
        )
    };

    //3. Dispatch Notofication based on Queue step
    console.log(`[QStash Worker]: Executing Step ${payload.step} for ${payload.customerEmail}`);

    const paymentLink = invoice.hostedInvoiceUrl || process.env.NEXT_PUBLIC_APP_URL || "https://stripe.com";
    let messageId: string | null = null;
    let channel: "email" | "whatsapp" = "email";

    //Dispatch Strategy based on Sequence step
    if(payload.step === 2 && invoice.customerPhone) {
        channel = "whatsapp"
        const result = await sendWhatsAppDunning({
            toPhone: invoice.customerPhone,
            customerName: invoice.customerName,
            amountDue: invoice.amountDue,
            currency: invoice.currency,
            paymentLink,
        });
        messageId = result.sid;
    }else {
        channel = "email";
        const result = await sendDunningEmail({
            to: invoice.customerEmail,
            customerName: invoice.customerName,
            amountDue: invoice.amountDue,
            currency: invoice.currency,
            paymentLink,
        });
        messageId = result.id;

        //Audit trail insertion into Neon DB
    }

    //Log dispatch attempt in Neon DB
    await db.insert(recoveryLogs).values({
        failedInvoiceId: invoice.id,
        channel,
        status:  messageId ? "sent" : "failed",
        payloadMessageId: messageId,
    });

    if (!messageId) {
        return NextResponse.json(
            {success: false, message: `Failed to send recovery step ${payload.step} via ${channel}`},
            {status: 502}
        );
    }

    return NextResponse.json(
        {success: true, message: `Successfully executed recovery step ${payload.step} via ${channel}`},
        {status: 200}
    );
}