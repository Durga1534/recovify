import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { users, failedInvoices, recoveryLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  User,
  CreditCard,
  DollarSign,
  Phone,
  MessageSquare,
  Mail,
} from "lucide-react";
import Link from "next/link";
import ManualActions from "./ManualActions";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // 1. Fetch Tenant User
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    redirect("/sign-in");
  }

  // 2. Fetch Target Invoice scoped to tenant
  const [invoice] = await db
    .select()
    .from(failedInvoices)
    .where(and(eq(failedInvoices.id, id), eq(failedInvoices.userId, user.id)))
    .limit(1);

  if (!invoice) {
    notFound();
  }

  // 3. Fetch chronological recovery logs for this invoice
  const logs = await db
    .select()
    .from(recoveryLogs)
    .where(eq(recoveryLogs.failedInvoiceId, invoice.id))
    .orderBy(desc(recoveryLogs.sentAt));

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency.toUpperCase(),
  }).format(invoice.amountDue / 100);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>

        {/* Header Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight">Invoice Detail</h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    invoice.status === "recovered"
                      ? "bg-emerald-100 text-emerald-800"
                      : invoice.status === "failed"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-1">
                Stripe ID: {invoice.stripeInvoiceId}
              </p>
            </div>

            {invoice.hostedInvoiceUrl && (
              <a
                href={invoice.hostedInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl transition-colors shrink-0"
              >
                <span>Pay via Stripe Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                Amount Outstanding
              </span>
              <p className="text-lg font-bold text-gray-900">{formattedAmount}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Customer Contact
              </span>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {invoice.customerName || "Unnamed Customer"}
              </p>
              <p className="text-xs text-gray-500 truncate">{invoice.customerEmail}</p>
              {invoice.customerPhone && (
                <p className="text-xs text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {invoice.customerPhone}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Created At
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(invoice.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Operator Controls */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Manual Operator Controls</h2>
          <ManualActions
            invoiceId={invoice.id}
            isRecovered={invoice.status === "recovered"}
            hasPhone={!!invoice.customerPhone}
          />
        </div>

        {/* Timeline History Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recovery Attempt Timeline</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chronological audit log of automated and manual outreach events.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {logs.length} Logged Events
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No recovery actions recorded yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Automated outreach runs according to your scheduled dunning sequence (Day 0, Day 3, Day 7).
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4 space-y-8 py-2">
              {logs.map((log) => {
                const isSuccess = log.status === "sent" || log.status === "delivered";
                const isFailed = log.status === "failed";
                const isWhatsApp = log.channel === "whatsapp";

                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Timeline Node Icon */}
                    <span className="absolute -left-4.25 top-0.5 bg-white p-1 rounded-full border border-gray-200 shadow-xs">
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : isFailed ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      ) : isWhatsApp ? (
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Send className="w-5 h-5 text-indigo-600" />
                      )}
                    </span>

                    {/* Content Box */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isWhatsApp
                                ? "bg-emerald-100 text-emerald-950"
                                : "bg-indigo-100/70 text-indigo-950"
                            }`}
                          >
                            {isWhatsApp ? (
                              <MessageSquare className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <Mail className="w-3 h-3 text-indigo-700" />
                            )}
                            {log.channel || "email"}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {log.status === "delivered" ? "Delivered" : log.status === "sent" ? "Sent" : log.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(log.sentAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {log.status === "failed" ? (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-mono">
                          Recovery message failed to send.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Message dispatched to{" "}
                          <span className="font-semibold text-gray-800">
                            {isWhatsApp ? invoice.customerPhone : invoice.customerEmail}
                          </span>.
                          {log.payloadMessageId && (
                            <span className="block text-gray-400 font-mono mt-1">
                              Message ID: {log.payloadMessageId}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}