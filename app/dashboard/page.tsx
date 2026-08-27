import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getRecentInvoices } from "@/lib/analytics/queries";
import { getTenantAnalytics } from "@/lib/analytics";
import { Settings, Palette, BarChart3 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import Link from "next/link";
import AnalyticsCards from "@/components/dashboard/AnalyticsCards";
import ExportCSVButton from "./_components/ExportCSVButton";

export const revalidate = 0;

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  // Look up user record in Neon DB using Clerk ID
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  let user = existingUser;

  // Auto-sync user to Neon DB if user webhook hasn't fired yet
  if (!user) {
    if (!email) {
      throw new Error("Authenticated Clerk user has no email address");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId,
        email,
      })
      .returning();
    user = newUser;
  }

  // Redirect to onboarding if Stripe account is not connected
  if (!user.stripeAccountId) {
    redirect("/dashboard/onboarding");
  }

  const analytics = await getTenantAnalytics(user.id);
  const recentInvoices = await getRecentInvoices(user.id, 10);

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header with User Navigation */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recovery Dashboard</h1>
            <p className="text-gray-500 text-xs">
              Tenant ID: <span className="font-mono">{user.id}</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Tenant Active</span>
            </div>
            <Link
              href="/dashboard/settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>
            <Link
              href="/dashboard/template-settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Email Templates"
            >
              <Palette className="w-5 h-5 text-gray-600" />
            </Link>
            <Link
              href="/dashboard/analytics"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Detailed Analytics"
            >
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </Link>
            <UserButton />
          </div>
        </div>

        {/* Analytics Metric Cards Block */}
        <AnalyticsCards stats={analytics} />

        {/* Live Status Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Your Failed Invoices</h2>
              <span className="text-xs font-semibold text-gray-400">Tenant Isolated</span>
            </div>

            {/* Export CSV Action */}
            <ExportCSVButton />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Customer Email</th>
                  <th className="px-6 py-3">Stripe Invoice</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Ingested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No failed payments recorded for your tenant account.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {invoice.customerEmail}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {invoice.stripeInvoiceId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {invoice.status === "recovered" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Recovered
                          </span>
                        )}
                        {invoice.status === "pending" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            In Recovery
                          </span>
                        )}
                        {invoice.status === "failed" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Unrecoverable
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}