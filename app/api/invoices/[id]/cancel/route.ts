import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, failedInvoices, recoveryLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request, {params}: {params: Promise<{id: string}>} ) {
    const {id} = await params;
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
    
    const [invoice] = await db
      .select()
      .from(failedInvoices)
      .where(and(eq(failedInvoices.id, id), eq(failedInvoices.userId, user.id)))
      .limit(1)

    if(!invoice) {
        return NextResponse.json({error: "Invoice not found"}, {status: 404});
    }  

    // Update status to recovered/cancelled to halt future worker execution guards
    await db
      .update(failedInvoices)
      .set({
        status: "recovered",
        updatedAt: new Date(),
      })
      .where(eq(failedInvoices.id, invoice.id));

      // Log manual abort action
      await db.insert(recoveryLogs).values({
        failedInvoiceId: invoice.id,
        channel: "email",
        status: "sent",
        payloadMessageId: `manual_abort_${Date.now()}`,
      })

      return NextResponse.json({success: true, message: "Recovery sequence halted successfully."});
} 