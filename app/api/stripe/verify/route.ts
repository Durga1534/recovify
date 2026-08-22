import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { stripe } from "@/lib/stripe/client";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic"

export async function GET() {
    const {userId: clerkId} = await auth();

    if(!clerkId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    // Fetch taget user with core query syntax
    const [ user ] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

     if (!user) {
        return NextResponse.json({error: "User not found"}, {status: 404});
     }
     
     if (!user.stripeAccountId) {
        return NextResponse.json({
            connected: false,
            webhookActive: false,
            message: "No Stripe account linked. Complete onboarding first."
        });
     }

     try {
        // Retrive webhook endpoints for the connected account
        const endpoints = await stripe.webhookEndpoints.list(
            {limit: 10},
            {stripeAccount: user.stripeAccountId}
        )

        const targetPath = "/api/webhooks/stripe";
        const activeEndPoint = endpoints.data.find(
            (ep) => ep.url.includes(targetPath) && ep.status === "enabled"
        );

        const hasFailedInvoiceEvent = activeEndPoint?.enabled_events.some(
            (evt) => evt === "*" || evt === "invoice.payment_failed"
        );

        return NextResponse.json({
            connected: true,
            stripeAccountId: user.stripeAccountId,
            webhookActive: Boolean(activeEndPoint && hasFailedInvoiceEvent),
            endpointUrl: activeEndPoint?.url ?? null,
            events: activeEndPoint?.enabled_events ?? [],
            lastChecked: new Date().toISOString(),
        });
     } catch (error) {
        console.error("[Webhook Verify Error]:", error);
        return NextResponse.json({
            connected: true,
            stripeAccountId: user.stripeAccountId,
            webhookActive: false,
            error: "Failed to query Stripe webhook configuration."
        }, 
        {status: 500}
       );
     }
}