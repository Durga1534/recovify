import { db } from "@/db";
import { users } from "@/db/schema";
import { getDashBoardMetrics, getRecentInvoices } from "@/lib/analytics/queries"
import {DollarSign, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react"
import { asc } from "drizzle-orm";

export const revalidate = 0; // Force dynamic rendering for real-time dashboard data

export default async function DashboardPage() {
    // Fetch default registered founder for demos/single-tenant context
    const [defaultUser] = await db
        .select()
        .from(users)
        .orderBy(asc(users.createdAt))
        .limit(1);
    
    if(!defaultUser) {
        return(
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">No Founder Account Setup</h2>
                    <p className="text-gray-600 mt-2 text-sm">Please complete system setup or seed your user account in Neon DB to view analytics.</p>
                </div>
            </div>
        )
    }

    const metrics = await getDashBoardMetrics(defaultUser.id);
    const recentInvoices = await getRecentInvoices(defaultUser.id, 10);

    const formatCurrency = (cents: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(cents / 100);
    }

  return (
    <div className="min-n-screen bg-gray-50 text-gray-900 p-8">
        <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Recovery Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Real-time revenue dunning and payment recovery metrics.</p>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Stripe Engine Active</span>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Recovered Revenue</span>
                        <DollarSign className="w-5 h-5 text-emerald-500"/>
                    </div>
                    <div className="text-2xl font-black mt-2 text-emerald-600">
                        {formatCurrency(metrics.totalRecovered, "usd")}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{metrics.recoveredCount} invoices saved</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Revenue at Risk</span>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black mt-2 text-emerald-600">
                        {formatCurrency(metrics.totalRecovered, "usd")}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{metrics.recoveredCount} invoices saved</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Revenue at Risk</span>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black mt-2 text-amber-600">
                        {formatCurrency(metrics.totalAtRisk, "usd")}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Currently in dunning sequence</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Recovery Rate</span>
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black mt-2 text-gray-900">
                        {metrics.recoveryRate}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Target benchmark: 60%+</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-gray-500">
                        <span className="text-sx font-bold uppercase tracking-wider">Total Failures</span>
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-2xl font-black mt-2 text-gray-900">
                        {metrics.totalFailedCount}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Failed payments ingested</p>
                </div>
            </div>

            {/* Live Status Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Recent Failed Invoices</h2>
                    <span className="text-xs font-semibold text-gray-400">Auto-updating</span>
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
                                        No failed payments detected yet. Trigger a webhook test using Stripe CLI!
                                    </td>
                                </tr>
                            ) : (
                                recentInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{invoice.customerEmail}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{invoice.stripeInvoiceId}</td>
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
                                                    Pending
                                                </span>
                                            )}
                                            {invoice.status === "failed" && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full ftext-xs font-bold bg-rose-100 text-rose-800">
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
    
  )
}
