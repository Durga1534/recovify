import Stripe from "stripe";

if(!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is missing.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-07-29.dahlia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
        name: "Recovify Payment Recovery SaaS",
        version: "1.0.0",
    },
});