import {NextResponse} from "next/server"
import { db } from "@/db"
import { recoveryLogs } from "@/db/schema";
import { eq } from "drizzle-orm"
import { verifyTwilioSignature } from "@/lib/twilio-verify";

export async function POST(req: Request) {
    try{
        const rawBody = await req.text();
        const params = Object.fromEntries(new URLSearchParams(rawBody));

        // Extract key parameters sent by twilio
        const messageSid = params.MessageSid || params.SmsSid;
        const messageStatus = params.MessageStatus; // 'sent', 'delivered', 'read', 'failed', 'undelivered'

        // Verify Twilio Signature in Production / Non-Local environments
        const twilioSignature = req.headers.get("x-twilio-signature");
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;

        if(process.env.NODE_ENV === "production" && process.env.TWILIO_AUTH_TOKEN) {
            const isValid = verifyTwilioSignature({
                url: webhookUrl,
                params,
                signature: twilioSignature || "",
                authToken: process.env.TWILIO_AUTH_TOKEN,
            });

            if(!isValid) {
                console.warn("[Twilio Webhook]: Invalid signature received.");
                return new NextResponse("Unauthorized", {status: 401});
            }
        }

        if(!messageSid || !messageStatus) {
            return new NextResponse("Missing required parameters", {status: 400})
        }

        //1. Locate the existing recovery log record by messageSid
        const [existingLog] = await db
          .select()
          .from(recoveryLogs)
          .where(eq(recoveryLogs.payloadMessageId, messageSid))
          .limit(1);
        
          if(existingLog) {
            //2. Map Twilio status internal status format
            let statusToUpdate: "sent" | "delivered" | "failed" = "sent";

            if (messageStatus == "delivered" || messageStatus === "read") {
                statusToUpdate = "delivered";
            } else if (messageStatus === "failed" || messageStatus === "undelivered") {
                statusToUpdate = "failed";
            }

            //3. Update status in database
            await db
              .update(recoveryLogs)
              .set({
                status: statusToUpdate,
                                sentAt: new Date(),
              })
              .where(eq(recoveryLogs.id, existingLog.id));

                            console.log(`[Twilio Webhook]: Updated Log ${existingLog.id} status to ${messageStatus}`);
          } else {
            console.log(`[Twilio Webhook]: No matching recovery log found for MessageSid: ${messageSid}`)
          }

          //Twilio expects TwiML XML or empty 200 response
          return new NextResponse("<Response></Response>", {
            status: 200,
            headers: {"Content-Type": "text/xml"},
          })
    } catch (error) {
        console.error("[Twilio Webhook Error]:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}