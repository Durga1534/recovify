import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { users } from "./users"

export const dunningSettings = pgTable("dunning_settings", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"})
    .unique(),
    companyName: text("company_name").default("My SaaS Cpmpany"),
    brandColor: text("brand_color").default("#4F46E5"), //Hex brand primary color
    senderName: text("sender_name").default("Billing Team"),
    replyToEmail: text("reply_to_email"),

    // Channels Enabled
    emailEnabled: boolean("email_enabled").default(true).notNull(),
    whatsappEnabled: boolean("whatsapp_enabled").default(false).notNull(),

    // Template Copy Override
    emailSubjectStep1: text("email_subject_step1").default("Action Required: Payment failed for your subscription"),
    emailBodyStep2: text("email_body_step2").default("We were unable to process your recent subscription payment. Please update your payment details to maintain service continuity."),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});