import { DollarSign, Percent, Clock, AlertCircle } from "lucide-react";
import type { AnalyticsSummary } from "@/lib/analytics";

interface AnalyticsCardsProps {
    stats: AnalyticsSummary;
}

export default function AnalyticsCards({ stats }: AnalyticsCardsProps) {
    const formatCurrency = (amountCents: number) =>
         new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
         }).format(amountCents / 100);

         return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Recovered MRR */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Recovered MRR
                        </span>
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <DollarSign className="w-4 h-4" />
                        </div>                    
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(stats.totalRecoveredAmount)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold text-emerald-600">
                                {stats.recoveredCount} invoices
                            </span>{" "}
                            recovered
                        </p>
                    </div>
                </div>

                {/* Recovery Success Rate */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Recovery Rate
                        </span>
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {stats.recoveryRate.toFixed(1)}%
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Out of {stats.totalInvoices} total failed payments
                        </p>
                    </div>
                </div>

                {/* In-Flight Recovery (Pending) */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Pending Recovery
                        </span>
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(stats.totalPendingAmount)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold text-amber-600">
                                {stats.pendingCount} sequences
                            </span>{" "}
                            in progress
                        </p>
                    </div>
                </div>

                {/* Unrecovered Revenue */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Uncovered
                        </span>
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {formatCurrency(stats.totalFailedAmount)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold text-rose-600">
                                {stats.failedCount} invoices
                            </span>{" "}
                            churned
                        </p>
                    </div>
                </div>
            </div>
         )
}