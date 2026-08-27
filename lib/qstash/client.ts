import { Client } from "@upstash/qstash";
import type { RecoveryJobPayload } from "./types";
import { getAppUrl } from "@/lib/app-url";
if(!process.env.QSTASH_TOKEN) {
    throw new Error("QSTASH_TOKEN environment variable is missing.");
}

export const qstashClient = new Client({
   token: process.env.QSTASH_TOKEN,
});

export async function publishRecoverySequence(payload: Omit<RecoveryJobPayload, "step">) {
    const baseUrl = getAppUrl();
    const targetUrl = `${baseUrl}/api/qstash/recovery-worker`;

    // Define delays in seconds
    const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60; //259, 200 sec
    const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60; // 604,800 sec

    try {
        // Step 1: Immediate dispatch
        await qstashClient.publishJSON({
            url: targetUrl,
            body: {...payload, step: 1} satisfies RecoveryJobPayload, 
        });

        // Step 2: Delayed by 3 days
        await qstashClient.publishJSON({
            url: targetUrl,
            body: {...payload, step: 2} satisfies RecoveryJobPayload,
            delay: THREE_DAYS_IN_SECONDS,
        });

        //sTEP 3: Delayed by 7 days
        await qstashClient.publishJSON({
            url: targetUrl,
            body: {...payload, step: 3} satisfies RecoveryJobPayload,
            delay: SEVEN_DAYS_IN_SECONDS,
        });

        console.log(`[QSTASH Sequence]: Scheduled 3-step recovery sequence for invoice ${payload.stripeInvoiceId}`);
    } catch(err) {
        console.error("[QStash Sequence Error]: Failed to schedule sequence", err)
    }
}