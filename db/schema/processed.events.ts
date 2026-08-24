import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedEvents = pgTable("processed_events", {
    id: text("id").primaryKey(), // Holds Stripe Event ID
    eventType: text("event_type").notNull(),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
})