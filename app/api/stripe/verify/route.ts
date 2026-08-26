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
        // Verify the connected account. Stripe OAuth does not permit this app
        // to list webhook endpoints on the connected account.
        const account = await stripe.accounts.retrieve(
            user.stripeAccountId,
            {},
            {stripeAccount: user.stripeAccountId}
        );

        return NextResponse.json({
            connected: account && !account.deleted,
            stripeAccountId: user.stripeAccountId,
            webhookActive: null,
            webhookStatus: "not_verifiable_through_oauth",
            message: "Stripe account connection is valid. Webhook endpoint status must be verified from the platform account or Stripe CLI.",
            lastChecked: new Date().toISOString(),
        });
     } catch (error) {
        console.error("[Webhook Verify Error]:", error);
        return NextResponse.json({
            connected: true,
            stripeAccountId: user.stripeAccountId,
            webhookActive: false,
            error: error instanceof Error ? error.message : "Failed to verify Stripe account connection."
        }, 
        {status: 500}
       );
     }
}