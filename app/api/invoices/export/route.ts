import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { failedInvoices, recoveryLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 1. Resolve internal user ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // 2. Fetch all tenant invoices
  const records = await db
    .select()
    .from(failedInvoices)
    .where(eq(failedInvoices.userId, user.id))
    .orderBy(desc(failedInvoices.createdAt));

  const logs = await db
    .select({ failedInvoiceId: recoveryLogs.failedInvoiceId })
    .from(recoveryLogs)
    .innerJoin(failedInvoices, eq(recoveryLogs.failedInvoiceId, failedInvoices.id))
    .where(eq(failedInvoices.userId, user.id));

  const outreachCounts = new Map<string, number>();
  for (const log of logs) {
    outreachCounts.set(
      log.failedInvoiceId,
      (outreachCounts.get(log.failedInvoiceId) ?? 0) + 1
    );
  }

  // 3. Define CSV headers
  const headers = [
    "Invoice ID",
    "Customer Name",
    "Customer Email",
    "Amount Due ($)",
    "Currency",
    "Status",
    "Outreach Count",
    "Stripe Invoice ID",
    "Created Date",
    "Updated Date",
  ];

  // 4. Format rows with proper CSV escaping
  const formatCell = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((inv) => [
    formatCell(inv.id),
    formatCell(inv.customerName),
    formatCell(inv.customerEmail),
    formatCell((inv.amountDue / 100).toFixed(2)),
    formatCell(inv.currency?.toUpperCase() || "USD"),
    formatCell(inv.status),
    formatCell(outreachCounts.get(inv.id) ?? 0),
    formatCell(inv.stripeInvoiceId),
    formatCell(inv.createdAt ? new Date(inv.createdAt).toISOString() : ""),
    formatCell(inv.updatedAt ? new Date(inv.updatedAt).toISOString() : ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  const filename = `invoice-recovery-export-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}