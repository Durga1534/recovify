import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CheckCircle2, ShieldCheck, ArrowRight, Zap } from "lucide-react";

export const revalidate = 0;

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  const isConnected = Boolean(user?.stripeAccountId);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect Your Stripe Account</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Recovify requires read access to your Stripe webhooks to automatically detect failed subscription payments and begin recovery.
          </p>
        </div>

        {/* Features Checklist */}
        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100 text-sm">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Zero-Code Integration</p>
              <p className="text-gray-500 text-xs mt-0.5">Automated webhook registration handled safely via official Stripe OAuth.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Automated Webhook Monitoring</p>
              <p className="text-gray-500 text-xs mt-0.5">Captures <code className="text-indigo-600 font-mono">invoice.payment_failed</code> instantly when subscriptions fail.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Secure OAuth Permission</p>
              <p className="text-gray-500 text-xs mt-0.5">Recovify never stores or views your customer&apos; raw credit card information.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isConnected ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <p className="text-emerald-800 font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Stripe Account Linked ({user.stripeAccountId})
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
            >
              Go to Analytics Dashboard →
            </a>
          </div>
        ) : (
          <a
            href="/api/stripe/connect"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-colors"
          >
            <span>Connect Stripe Account</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        )}

      </div>
    </div>
  );
}