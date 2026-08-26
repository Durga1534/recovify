import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { failedInvoices, users, recoveryLogs } from "@/db/schema";
import {eq, and} from "drizzle-orm";
import { sendWhatsAppDunningMessage } from "@/lib/twilio";

export async function POST (_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const {userId: clerkId} = await auth();
        if(!clerkId) {
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if(!user) {
            return NextResponse.json({error: "User not found"}, {status: 404});
        }  

        const { id: invoiceId } = await params;

        // Fetch invoice ensuring tenant isolation
        const [invoice] = await db
          .select()
          .from(failedInvoices)
          .where(and(eq(failedInvoices.id, invoiceId), eq(failedInvoices.userId, user.id)))
          .limit(1);

        if(!invoice) {
            return NextResponse.json({error: "Invoice not found"}, {status: 404})
        }
        
        if(!invoice.customerPhone) {
            return NextResponse.json({error: "Customer has no phone number recorded"}, {status: 400})
        }

        const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`;

        // Send WhatsApp message via Twilio
        const res = await sendWhatsAppDunningMessage({
            toPhone: invoice.customerPhone,
            customerName: invoice.customerName || undefined,
            amountDue: invoice.amountDue,
            currency: invoice.currency,
            paymentLink: updateUrl,
        });

        if (!res.sid) {
            return NextResponse.json({ error: res.error || "WhatsApp dispatch failed" }, { status: 502 });
        }

        // Log the manual action
        await db.insert(recoveryLogs).values({
            failedInvoiceId: invoice.id,
            channel: "whatsapp",
            status: "delivered",
            payloadMessageId: res.sid,
        });

        return NextResponse.json({ success: true, messageSid: res.sid });
    }catch(err: unknown) {
        console.error("[Manual WhatsApp Error]: ", err);
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}