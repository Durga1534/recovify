import { db } from "@/db";
import { failedInvoices } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export interface DashboardMetrics {
    totalRecovered: number;
    totalAtRisk: number;
    recoveryRate: number;
    totalFailedCount: number;
    recoveredCount: number;
}

export interface RecentInvoiceActivity {
    id: string;
    stripeInvoiceId: string;
    customerEmail: string;
    amountDue: number;
    currency: string;
    status: "pending" | "recovered" | "failed";
    createdAt: Date;
}

export async function getDashBoardMetrics(userId: string): Promise<DashboardMetrics> {
    const result = await db.select({
        status: failedInvoices.status,
        totalAmount: sql<number>`SUM(${failedInvoices.amountDue})`,
        count: sql<number>`count(${failedInvoices.id})`,
    })
    .from(failedInvoices)
    .where(eq(failedInvoices.userId, userId))
    .groupBy(failedInvoices.status);

    let totalRecovered = 0;
    let totalAtRisk = 0;
    let recoveredCount = 0;
    let totalFailedCount = 0;

    for (const row of result) {
        const amount = Number(row.totalAmount || 0);
        const count = Number(row.count || 0);
        totalFailedCount += count;

        if(row.status === "recovered") {
            totalRecovered += amount;
            recoveredCount += count;
        } else if(row.status === "pending") {
            totalAtRisk += amount;
        }
    }

    const recoveryRate = totalFailedCount > 0
      ? Math.round((recoveredCount / totalFailedCount) * 100)
      : 0;

      return {
        totalRecovered,
        totalAtRisk,
        recoveryRate,
        totalFailedCount,
        recoveredCount,
      };
}

export async function getRecentInvoices(userId: string, limit = 10): Promise<RecentInvoiceActivity[]> {
    const records = await db
        .select()
        .from(failedInvoices)
        .where(eq(failedInvoices.userId, userId))
        .orderBy(desc(failedInvoices.createdAt))
        .limit(limit);

    return records.map((inv) => ({
        id: inv.id,
        stripeInvoiceId: inv.stripeInvoiceId,
        customerEmail: inv.customerEmail,
        amountDue: inv.amountDue,
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt,
    }));
}
