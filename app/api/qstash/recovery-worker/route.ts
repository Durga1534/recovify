import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import {db} from "@/db";
import {failedInvoices, recoveryLogs} from "@/db/schema";
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

    const payload = JSON.parse(bodyText) as RecoveryJobPayload;

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

    //Log dispatch attempt in Neon DB
    await db.insert(recoveryLogs).values({
        failedInvoiceId: invoice.id,
        channel: payload.step === 2 && payload.customerPhone ? "whatsapp" : "email",
        status: "sent",
        payloadMessageId: `qstash-step-${payload.step}-${Date.now()}`,
    });

    return NextResponse.json(
        {success: true, message: `Successfully executed recovery step ${payload.step}`},
        {status: 200}
    );
}