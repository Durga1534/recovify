import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"

export const failedInvoices = pgTable("failed_invoices", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
       .references(() => users.id, { onDelete: "cascade"})
       .notNull(),
       stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
       stripeCustomerId: text("stripe_customer_id").notNull(),
       customerEmail: text("customer_email").notNull(),
       customerName: text("customer_name"),
       customerPhone: text("customer_phone"),
       amountDue: integer("amount_due").notNull(),
       currency: text("currency").default("usd").notNull(),
       status: text("status", {
        enum: ["pending", "recovered", "failed"],
       }).default("pending").notNull(),
       hostedInvoiceUrl: text("hosted_invoice_url"),
       createdAt: timestamp("created_at").defaultNow().notNull(),
       updatedAt: timestamp("update_at").defaultNow().notNull(),
});

export type FailedInvoice = typeof failedInvoices.$inferSelect;
export type NewFailedInvoice = typeof failedInvoices.$inferInsert;