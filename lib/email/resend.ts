import { Resend } from "resend";
import { db } from "@/db";
import { dunningSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is missing.");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDunningEmailParams {
  userId?: string;
  to: string;
  customerName?: string | null;
  amountDue: number;
  currency: string;
  paymentLink: string;
}

export async function sendDunningEmail({
  userId,
  to,
  customerName,
  amountDue,
  currency,
  paymentLink,
}: SendDunningEmailParams) {
  // Fetch tenant branding settings if userId is provided
  let companyName = "Your Service Provider";
  let brandColor = "#4F46E5";
  let senderName = "Billing Team";
  let subject = "Action Required: Payment failed for your subscription";

  if (userId) {
    const [settings] = await db
      .select()
      .from(dunningSettings)
      .where(eq(dunningSettings.userId, userId))
      .limit(1);

    if (settings) {
      companyName = settings.companyName || companyName;
      brandColor = settings.brandColor || brandColor;
      senderName = settings.senderName || senderName;
      subject = settings.emailSubjectStep1 || subject;
    }
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountDue / 100);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
          .header { background: ${brandColor}; padding: 24px; text-align: center; color: #ffffff; }
          .content { padding: 32px; color: #374151; line-height: 1.6; }
          .amount-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
          .amount { font-size: 24px; font-weight: 800; color: #111827; }
          .btn { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin-top: 16px; text-align: center; }
          .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">${companyName}</h2>
          </div>
          <div class="content">
            <p>Hi ${customerName || "Customer"},</p>
            <p>We were unable to process the automatic payment for your subscription renewal.</p>
            <div class="amount-box">
              <div style="font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Amount Outstanding</div>
              <div class="amount">${formattedAmount}</div>
            </div>

            <p>Please click the button below to update your payment method and avoid service disruption:</p>
            <div style="text-align: center;">
              <a href="${paymentLink}" class="btn" target="_blank">Update Payment Method</a>
            </div>
          </div>
          <div class="footer">
            Sent securely by ${companyName} via Recovify Dunning Engine.
          </div>
        </div>
      </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: `${senderName} <onboarding@resend.dev>`,
    to: [to],
    subject,
    html: htmlContent,
  });

  if (error) {
    console.error("[Resend Error]:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}