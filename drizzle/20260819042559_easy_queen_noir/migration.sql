CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"name" text,
	"stripe_account_id" text,
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_now" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"stripe_subscription_id" text NOT NULL UNIQUE,
	"stripe_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"plan_type" text DEFAULT 'flat_29' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failed_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"stripe_invoice_id" text NOT NULL UNIQUE,
	"stripe_customer_id" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"amount_due" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"hosted_invoice_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"update_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"failed_invoice_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"payload_message_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "failed_invoices" ADD CONSTRAINT "failed_invoices_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recovery_logs" ADD CONSTRAINT "recovery_logs_failed_invoice_id_failed_invoices_id_fkey" FOREIGN KEY ("failed_invoice_id") REFERENCES "failed_invoices"("id") ON DELETE CASCADE;