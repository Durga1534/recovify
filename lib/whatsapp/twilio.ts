import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

export interface SendWhatsAppParams {
    toPhone: string;
    customerName?: string | null;
    amountDue: number;
    currency: string;
    paymentLink: string;
}

export async function sendWhatsAppDunning({
    toPhone,
    customerName,
    amountDue,
    currency,
    paymentLink
}: SendWhatsAppParams): Promise<{sid: string | null; error?: string}> {
    if(!accountSid || !authToken) {
        throw new Error("[Twilio]: Credentials missing. Skipping WhatsApp dispatch");
        return {sid: null, error: "Twilio credentials missing"};
    }

    const client = twilio(accountSid, authToken);
    const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amountDue / 100);

    const displayName = customerName || "there";
    const formattedPhone = toPhone.startsWith("whatsapp:") ? toPhone: `whatsapp:${toPhone}`;

    try {
        const message = await client.messages.create({
            from: fromNumber,
            to: formattedPhone,
            body: `Hi ${displayName}, your recent subscription payment of ${formattedAmount} was unsuccessful. Update your card surely here to keep your account active: ${paymentLink}`,
        });

        return {sid: message.sid};
    }catch(err) {
        const message = err instanceof Error? err.message : "WhatsApp dispatch failed";
        return {sid: null, error: message};
    }
}
