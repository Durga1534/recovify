import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users";

export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, {onDelete: "cascade"})
        .notNull()
        .unique(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    status: text("status", {
        enum: ["active", "past_due", "canceled", "incomplete", "trailing"],
    }).notNull(),
    planType: text("plan_type", { 
        enum: ["flat_29", "rev_share_5"]
    }).default("flat_29")
    .notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),    
})

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;