import { ReactNode } from "react";

interface MetricCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: ReactNode;
    trend?: string;
    trendPositive?: boolean;
}

export default function MetricCard({title, value, subtitle, icon, trend, trendPositive = true}: MetricCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {title}
                </span>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">{icon}</div>
            </div>

            <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
                    {trend && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendPositive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {trend}
                        </span>
                    )}
                </div>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
        </div>
    );
}