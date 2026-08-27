import { db } from "@/db";
import { failedInvoices, recoveryLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface AnalyticsSummary {
  totalRecoveredAmount: number; // in cents
  totalPendingAmount: number;   // in cents
  totalFailedAmount: number;    // in cents
  totalInvoices: number;
  recoveredCount: number;
  pendingCount: number;
  failedCount: number;
  recoveryRate: number;         // percentage (0 - 100)
  mrrSaved: number;             // in cents
  totalOutreachSent: number;
  channelBreakdown: {
    emailSent: number;
    whatsappSent: number;
  };
}

export async function getTenantAnalytics(userId: string): Promise<AnalyticsSummary> {
  // 1. Fetch aggregate metrics for invoices scoped to the user
  const [invoiceStats] = await db
    .select({
      totalInvoices: sql<number>`count(*)`,
      recoveredCount: sql<number>`sum(case when ${failedInvoices.status} = 'recovered' then 1 else 0 end)`,
      pendingCount: sql<number>`sum(case when ${failedInvoices.status} = 'pending' then 1 else 0 end)`,
      failedCount: sql<number>`sum(case when ${failedInvoices.status} = 'failed' then 1 else 0 end)`,
      totalRecoveredAmount: sql<number>`coalesce(sum(case when ${failedInvoices.status} = 'recovered' then ${failedInvoices.amountDue} else 0 end), 0)`,
      totalFailedAmount: sql<number>`coalesce(sum(${failedInvoices.amountDue}), 0)`,
      totalPendingAmount: sql<number>`coalesce(sum(case when ${failedInvoices.status} = 'pending' then ${failedInvoices.amountDue} else 0 end), 0)`,
    })
    .from(failedInvoices)
    .where(eq(failedInvoices.userId, userId));

  // 2. Fetch outreach log stats
  const [logStats] = await db
    .select({
      totalOutreachSent: sql<number>`count(*)`,
      emailSent: sql<number>`sum(case when ${recoveryLogs.channel} = 'email' then 1 else 0 end)`,
      whatsappSent: sql<number>`sum(case when ${recoveryLogs.channel} = 'whatsapp' then 1 else 0 end)`,
    })
    .from(recoveryLogs)
    .innerJoin(
      failedInvoices,
      eq(recoveryLogs.failedInvoiceId, failedInvoices.id)
    )
    .where(eq(failedInvoices.userId, userId));

  const totalInvoices = Number(invoiceStats?.totalInvoices || 0);
  const recoveredCount = Number(invoiceStats?.recoveredCount || 0);
  const pendingCount = Number(invoiceStats?.pendingCount || 0);
  const failedCount = Number(invoiceStats?.failedCount || 0);
  const totalRecoveredAmount = Number(invoiceStats?.totalRecoveredAmount || 0);
  const totalPendingAmount = Number(invoiceStats?.totalPendingAmount || 0);
  const totalFailedAmount = Number(invoiceStats?.totalFailedAmount || 0);

  const recoveryRate = totalInvoices > 0 ? (recoveredCount / totalInvoices) * 100 : 0;

  return {
    totalRecoveredAmount,
    totalPendingAmount,
    totalFailedAmount,
    totalInvoices,
    recoveredCount,
    pendingCount,
    failedCount,
    recoveryRate,
    mrrSaved: totalRecoveredAmount,
    totalOutreachSent: Number(logStats?.totalOutreachSent || 0),
    channelBreakdown: {
      emailSent: Number(logStats?.emailSent || 0),
      whatsappSent: Number(logStats?.whatsappSent || 0),
    },
  };
}