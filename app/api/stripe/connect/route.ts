import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createOAuthState } from "@/lib/stripe/oauth-state";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export async function GET() {
    const { userId } = await auth();

    if(!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if(!clientId) {
        return NextResponse.json(
            {error: "STRIPE_CONNECT_CLIENT_ID missing in environment"},
            {status: 500}
        );
    }

    const appUrl = getAppUrl();
    const redirectUri = `${appUrl}/api/stripe/callback`;

    //Stripe Connect OAuth Authorize URL
    const state = createOAuthState(userId);
    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(stripeConnectUrl)
}