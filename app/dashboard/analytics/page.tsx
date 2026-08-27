import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTenantAnalytics } from "@/lib/analytics";
import MetricCard from "./MetricCard";
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Send,
  Mail,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const revalidate = 0;

export default async function AnalyticsDashboardPage() {
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

  const analytics = await getTenantAnalytics(user.id);

  const formatCurrency = (amountInCents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amountInCents / 100);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Recovery Performance & MRR Saved
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time metric breakdown of recovered revenue, churn prevention, and outreach conversions.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total MRR Recovered"
            value={formatCurrency(analytics.totalRecoveredAmount)}
            subtitle="Revenue successfully saved"
            icon={<DollarSign className="w-5 h-5" />}
            trend="+100% saved"
            trendPositive={true}
          />
          <MetricCard
            title="Recovery Success Rate"
            value={`${analytics.recoveryRate.toFixed(1)}%`}
            subtitle={`${analytics.recoveredCount} of ${analytics.totalInvoices} invoices recovered`}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Total Outreach Dispatched"
            value={analytics.totalOutreachSent.toString()}
            subtitle="Automated & manual recovery attempts"
            icon={<Send className="w-5 h-5" />}
          />
          <MetricCard
            title="Total At-Risk Revenue"
            value={formatCurrency(analytics.totalFailedAmount)}
            subtitle="Cumulative value of failed charges"
            icon={<RefreshCw className="w-5 h-5" />}
          />
        </div>

        {/* Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recovery Status Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-900">Invoice Recovery Distribution</h2>
            
            <div className="space-y-4">
              {/* Recovered Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> Recovered ({analytics.recoveredCount})
                  </span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(analytics.totalRecoveredAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics.totalInvoices > 0
                          ? (analytics.recoveredCount / analytics.totalInvoices) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Pending Dunning Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <Clock className="w-4 h-4" /> In Active Dunning ({analytics.pendingCount})
                  </span>
                  <span className="text-gray-900 font-bold">
                    {analytics.totalInvoices > 0
                      ? `${((analytics.pendingCount / analytics.totalInvoices) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics.totalInvoices > 0
                          ? (analytics.pendingCount / analytics.totalInvoices) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Unrecoverable Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4" /> Unrecoverable / Failed ({analytics.failedCount})
                  </span>
                  <span className="text-gray-900 font-bold">
                    {analytics.totalInvoices > 0
                      ? `${((analytics.failedCount / analytics.totalInvoices) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-rose-400 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics.totalInvoices > 0
                          ? (analytics.failedCount / analytics.totalInvoices) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outreach Channel Performance */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-900">Outreach Volume by Channel</h2>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Email</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {analytics.channelBreakdown.emailSent}
                </p>
                <p className="text-xs text-gray-500">Total email notifications dispatched</p>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">WhatsApp</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {analytics.channelBreakdown.whatsappSent}
                </p>
                <p className="text-xs text-gray-500">Direct instant messages sent</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Combining Email with instant WhatsApp reminders improves payment update conversions by up to <span className="font-bold text-gray-900">38%</span> compared to email-only sequences.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}