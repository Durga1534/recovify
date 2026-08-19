import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import {failedInvoices} from "./failed.invoices"

export const recoveryLogs = pgTable("recovery_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    failedInvoiceId: uuid("failed_invoice_id")
       .references(() => failedInvoices.id, {onDelete: "cascade"})
       .notNull(),
    channel: text("channel", {enum : ["email", "whatsapp", "sms"]}).notNull(),
    status: text("status", { enum: ["queued", "sent", "delivered", "failed"]}).notNull(), 
    payloadMessageId: text("payload_message_id"),
    sentAt: timestamp("sent_at").defaultNow().notNull(),  
});

export type RecoveryLog = typeof recoveryLogs.$inferSelect;
export type NewRecoverLog = typeof recoveryLogs.$inferInsert;