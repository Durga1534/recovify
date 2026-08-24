import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {db} from "@/db";
import {users, failedInvoices, recoveryLogs} from "@/db/schema";
import { sendDunningEmail } from "@/lib/email/resend";
import {eq, and} from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request, {params}: {params: Promise<{id: string}> }) {
    const {id} = await params;
    const {userId: clerkId} = await auth();

    if(!clerkId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    // Fetch tenant user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

      if(!user) {
        return NextResponse.json({error: "User not found"}, {status: 404});
      }

      // Fetch target invoice scoped to tenant
      const [invoice] = await db
        .select()
        .from(failedInvoices)
        .where(and(eq(failedInvoices.id, id), eq(failedInvoices.userId, user.id)))
        .limit(1);

        if(!invoice) {
            return NextResponse.json({error: "Invoice not found"}, {status: 404});
        }

        const paymentLink = invoice.hostedInvoiceUrl || process.env.NEXT_PUBLIC_APP_URL || "https://stripe.com";

        try {
            // Send email via Resend engine
            const result = await sendDunningEmail({
                userId: user.id,
                to: invoice.customerEmail,
                customerName: invoice.customerName,
                amountDue: invoice.amountDue,
                currency: invoice.currency,
                paymentLink,
            });

            // Write log entry for audit history
            await db.insert(recoveryLogs).values({
                failedInvoiceId: invoice.id,
                channel: "email",
                status: "sent",
                payloadMessageId: result.id,
                sentAt: new Date(),
            });

            return NextResponse.json({success: true, message: `Manual reminder sent to ${invoice.customerEmail}`});
        } catch(error) {
            const errMessage = error instanceof Error ? error.message : " Failed to dispacth email";

            await db.insert(recoveryLogs).values({
                failedInvoiceId: invoice.id,
                channel: "email",
                status: "failed",
            });

            return NextResponse.json({error: errMessage}, {status: 500})
       }
}