import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, dunningSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
  ShieldCheck,
  Sliders,
  Activity
} from "lucide-react";
import SettingsForm from "./SettingsForm";

export const revalidate = 0;

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    redirect("/sign-in");
  }

  const [settings] = await db
    .select()
    .from(dunningSettings)
    .where(eq(dunningSettings.userId, user.id))
    .limit(1);

  const isConnected = Boolean(user?.stripeAccountId);

  const initialFormData = {
    companyName: settings?.companyName || "",
    supportEmail: user.email,
    enableWhatsApp: settings?.whatsappEnabled ?? true,
    enableEmail: settings?.emailEnabled ?? true,
    day0DelayHours: 0,
    day3DelayHours: 72,
    day7DelayHours: 168,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings & System Health</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your brand preferences, automated dunning cadences, and system webhooks.
          </p>
        </div>

        {/* Section 1: Brand & Dunning Sequence Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Configuration</h2>
          </div>
          <SettingsForm initialData={initialFormData} />
        </div>

        <hr className="border-gray-200" />

        {/* Section 2: System Health & Integrations */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">System Connections & Health</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Stripe OAuth Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Stripe Account Link</h3>
                    <p className="text-xs text-gray-500">OAuth Connection</p>
                  </div>
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Not Linked
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg font-mono truncate">
                Account ID: {user?.stripeAccountId || "None"}
              </div>

              {!isConnected && (
                <a
                  href="/dashboard/onboarding"
                  className="block text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition-colors"
                >
                  Connect Stripe Account
                </a>
              )}
            </div>

            {/* Webhook Pipeline Health */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Webhook Pipeline</h3>
                    <p className="text-xs text-gray-500">Event Ingestion Health</p>
                  </div>
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    Inactive
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1.5 text-gray-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Listens for <code className="font-mono text-indigo-600">invoice.payment_failed</code>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Listens to <code className="font-mono text-indigo-600">invoice.paid</code>
                </p>
              </div>

              <a
                href="/api/stripe/verify"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Verify Connection Live
              </a>
            </div>
          </div>

          {/* CLI Instructions */}
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-2 text-sm text-indigo-950">
            <h4 className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              Testing Local Webhooks
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              In local development, ensure your Stripe CLI tunnel is running in a terminal:
            </p>
            <pre className="bg-indigo-950 text-indigo-100 text-xs p-3 rounded-lg font-mono mt-2 overflow-x-auto">
              stripe listen --forward-to localhost:3000/api/webhooks/stripe
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}