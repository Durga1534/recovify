import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { verifyOAuthState } from "@/lib/stripe/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");
    const clerkUserId = state ? verifyOAuthState(state) : null;

    if (error) {
        return NextResponse.redirect(
            new URL(`/dashboard/onboarding?error=${encodeURIComponent(error)}`, req.url)
        );
    }

    if(!code || !clerkUserId) {
        return NextResponse.redirect(
            new URL("/dashboard/onboarding?error=invalid_oauth_state", req.url)
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
                const updatedUsers = await db
          .update(users)
          .set({
            stripeAccountId: connectedAccountId,
            updatedAt: new Date(),
          })
                      .where(eq(users.clerkId, clerkUserId))
                    .returning({ id: users.id });

                if (updatedUsers.length === 0) {
                        throw new Error("No matching application user found for Stripe account");
                }

          console.log(`[Stripe Connect]: Successfully linked Stripe Account ${connectedAccountId} to Clerk User ${clerkUserId}`);

          return NextResponse.redirect(
            new URL("/dashboard?connect=success", req.url)
          );
    }catch(error) {
        console.error("[Stripe Connect Callback Error]:", error)
        const errorCode = error instanceof Error && error.message.includes("does not belong")
            ? "stripe_credentials_mismatch"
            : "oauth_failed";
        return NextResponse.redirect(
            new URL(`/dashboard/onboarding?error=${errorCode}`, req.url)
        );
    }
}