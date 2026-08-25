import { db } from "@/db";
import { failedInvoices } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface RecoveryStats {
    totalRecoveredCents: number;
    totalPendingCents: number;
    totalFailedCents: number;
    recoveredCount: number;
    pendingCount: number;
    failedCount: number;
    totalInvoices: number;
    recoveryRate: number;
}

export async function getTenantAnalytics(userId: string): Promise<RecoveryStats> {
    const result = await db
      .select({
        status: failedInvoices.status,
        count: sql<number>`count(*)`,
        sumAmount: sql<number>`coalesce(sum(${failedInvoices.amountDue}), 0)`,
      })
      .from(failedInvoices)
      .where(eq(failedInvoices.userId, userId))
      .groupBy(failedInvoices.status);

    let totalRecoveredCents = 0;
    let totalPendingCents = 0;
    let totalFailedCents = 0;
    let recoveredCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    
    result.forEach((row) => {
        const count = Number(row.count);
        const sum = Number(row.sumAmount);

        if(row.status === "recovered") {
            totalRecoveredCents = sum;
            recoveredCount = count;
        } else if (row.status === "pending") {
            totalPendingCents = sum;
            pendingCount = count;
        } else if (row.status === "failed") {
            totalFailedCents = sum;
            failedCount = count;
        }
    });

    const totalInvoices = recoveredCount + pendingCount + failedCount;
    const recoveryRate = totalInvoices > 0 ? (recoveredCount / totalInvoices) * 100 : 0;

    return {
        totalRecoveredCents,
        totalPendingCents,
        totalFailedCents,
        recoveredCount,
        pendingCount,
        failedCount,
        totalInvoices,
        recoveryRate,
    };
}