import { Client } from "@upstash/qstash";

if(!process.env.QSTASH_TOKEN) {
    throw new Error("QSTASH_TOKEN environment variable is missing.");
}

export const qstashClient = new Client({
    baseUrl: process.env.QSTASH_BASE_URL,
    token: process.env.QSTASH_TOKEN,
});