import { Resend } from "resend"

if(!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is misssing.")
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendDunningEmailParams {
    to: string;
    customerName?: string | null;
    amountDue: number;
    currency: string;
    paymentLink: string;
}

export async function sendDunningEmail({
    to,
    customerName,
    amountDue,
    currency,
    paymentLink
}: SendDunningEmailParams) : Promise<{id: string | null; error?: string}> {
    const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amountDue / 100);

    const displayName = customerName || "there";

    try {
        const {data, error} = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Recovify <support@recovify.com>",
            to: [to],
            subject: `Action Required: Payment of ${formattedAmount} failed`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Payment Action Required</h2>
                <p>Hi ${displayName},</p>
                <p>We were unable to process your payment of <strong>${formattedAmount}</strong> for your subscription.</p>
                <p>Please update your billing details using the secure link below to avoid service interruption:</p>
                <div style="margin: 30px 0;">
                    <a href="${paymentLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Update Payment Method
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">If you've already updated your payment details, please ignore this message.</p>
                </div>
            `,
        });

        if(error) {
            return {id: null, error: error.message};
        }
        return {id: data?.id ?? null};
    }catch(err) {
        const message = err instanceof Error ? err.message : "Failed to send email";
        return {id: null, error: message};
    }
}