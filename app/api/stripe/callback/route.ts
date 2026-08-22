import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clerkUserId = searchParams.get("state") // Extracted state paramater

    if(!code || !clerkUserId) {
        return NextResponse.redirect(
            new URL("/dashboard/onboarding?error=missing_code", req.url)
        );
    }

    try {
        // Exchange 0Auth code for connected account credentials
        const response = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
        });

        const connectedAccountId = response.stripe_user_id;

        if(!connectedAccountId) {
            throw new Error("Failed to retrive connected account ID from Stripe");
        }

        // Update user record in Neon DB using Core Query syntax
        await db
          .update(users)
          .set({
            stripeAccountId: connectedAccountId,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, clerkUserId));

          console.log(`[Stripe Connect]: Successfully linked Stripe Account ${connectedAccountId} to Clerk User ${clerkUserId}`);

          return NextResponse.redirect(
            new URL("/dashboard?connect=success", req.url)
          );
    }catch(error) {
        console.error("[Stripe Connect Callback Error]:", error)
        return NextResponse.redirect(
            new URL("/dashboard/onboarding?error=oauth_failed", req.url)
        );
    }
}