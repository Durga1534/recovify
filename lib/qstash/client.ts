import { Client } from "@upstash/qstash";

if(!process.env.QSTASH_TOKEN) {
    throw new Error("QSTASH_TOKEN environment variable is missing.");
}

export const qstashClient = new Client({
    token: process.env.QSTASH_TOKEN,
});