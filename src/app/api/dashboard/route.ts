import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, payments, customers, expenses, purchases, cashBook } from "@/db/schema";
import { sql, eq, and, gte, desc } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "dashboard");
  if (auth instanceof Response) return auth;
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const thisYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Today's sales
    const [todaySales] = await db
      .select({
        total: sql<number>`coalesce(sum(${estimates.grandTotal}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, today)
        )
      );

    // Monthly sales
    const [monthlySales] = await db
      .select({
        total: sql<number>`coalesce(sum(${estimates.grandTotal}), 0)`,
        count: sql<number>`count(*)`,
        paid: sql<number>`coalesce(sum(${estimates.paidAmount}), 0)`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, thisMonth)
        )
      );

    // Last month for comparison
    const [lastMonthSales] = await db
      .select({
        total: sql<number>`coalesce(sum(${estimates.grandTotal}), 0)`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, lastMonth),
          sql`${estimates.invoiceDate} < ${thisMonth}`
        )
      );

    // Yearly sales
    const [yearlySales] = await db
      .select({
        total: sql<number>`coalesce(sum(${estimates.grandTotal}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, thisYear)
        )
      );

    // Total outstanding
    const [outstanding] = await db
      .select({
        total: sql<number>`coalesce(sum(${estimates.balanceAmount}), 0)`,
        count: sql<number>`count(*) filter (where ${estimates.paymentStatus} != 'paid')`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice")
        )
      );

    // Monthly expenses
    const [monthlyExpenses] = await db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.isDeleted, false),
          gte(expenses.expenseDate, thisMonth)
        )
      );

    // Monthly purchases
    const [monthlyPurchases] = await db
      .select({
        total: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)`,
      })
      .from(purchases)
      .where(
        and(
          eq(purchases.isDeleted, false),
          gte(purchases.purchaseDate, thisMonth)
        )
      );

    // Cash balance
    const [cashBalance] = await db
      .select({
        debit: sql<number>`coalesce(sum(${cashBook.debit}), 0)`,
        credit: sql<number>`coalesce(sum(${cashBook.credit}), 0)`,
      })
      .from(cashBook);

    // Total counts
    const [counts] = await db
      .select({
        totalCustomers: sql<number>`count(*)`,
      })
      .from(customers)
      .where(eq(customers.isDeleted, false));

    const [invoiceCounts] = await db
      .select({
        totalInvoices: sql<number>`count(*) filter (where ${estimates.type} = 'invoice')`,
        totalQuotations: sql<number>`count(*) filter (where ${estimates.type} = 'quotation')`,
        pendingInvoices: sql<number>`count(*) filter (where ${estimates.type} = 'invoice' and ${estimates.paymentStatus} != 'paid')`,
      })
      .from(estimates)
      .where(eq(estimates.isDeleted, false));

    // Monthly revenue chart
    const monthlyRevenue = await db
      .select({
        month: sql<string>`to_char(${estimates.invoiceDate}::date, 'Mon')`,
        monthNum: sql<number>`extract(month from ${estimates.invoiceDate}::date)`,
        year: sql<number>`extract(year from ${estimates.invoiceDate}::date)`,
        revenue: sql<number>`coalesce(sum(${estimates.grandTotal}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, last6Months.toISOString().split("T")[0])
        )
      )
      .groupBy(
        sql`to_char(${estimates.invoiceDate}::date, 'Mon')`,
        sql`extract(month from ${estimates.invoiceDate}::date)`,
        sql`extract(year from ${estimates.invoiceDate}::date)`
      )
      .orderBy(
        sql`extract(year from ${estimates.invoiceDate}::date)`,
        sql`extract(month from ${estimates.invoiceDate}::date)`
      );

    // Recent invoices
    const recentInvoices = await db
      .select({
        id: estimates.id,
        invoiceNumber: estimates.invoiceNumber,
        type: estimates.type,
        customerName: estimates.customerName,
        grandTotal: estimates.grandTotal,
        paidAmount: estimates.paidAmount,
        balanceAmount: estimates.balanceAmount,
        paymentStatus: estimates.paymentStatus,
        invoiceDate: estimates.invoiceDate,
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .where(eq(estimates.isDeleted, false))
      .orderBy(desc(estimates.createdAt))
      .limit(5);

    // Pending payments
    const pendingPayments = await db
      .select({
        id: estimates.id,
        invoiceNumber: estimates.invoiceNumber,
        customerName: estimates.customerName,
        balanceAmount: estimates.balanceAmount,
        invoiceDate: estimates.invoiceDate,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          sql`${estimates.paymentStatus} != 'paid'`,
          sql`${estimates.balanceAmount} > 0`
        )
      )
      .orderBy(desc(estimates.balanceAmount))
      .limit(5);

    // Credit alerts (customers exceeding credit limit)
    const creditAlerts = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        creditLimit: customers.creditLimit,
        balance: customers.balance,
      })
      .from(customers)
      .where(
        and(
          eq(customers.isDeleted, false),
          sql`${customers.balance} > ${customers.creditLimit}`,
          sql`${customers.creditLimit} > 0`
        )
      )
      .orderBy(desc(customers.balance))
      .limit(5);

    // Top customers
    const topCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        totalBusiness: customers.totalBusiness,
        balance: customers.balance,
      })
      .from(customers)
      .where(eq(customers.isDeleted, false))
      .orderBy(desc(customers.totalBusiness))
      .limit(5);

    // Calculate growth
    const lastMonthTotal = lastMonthSales?.total || 0;
    const thisMonthTotal = monthlySales?.total || 0;
    const growthPercent = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    // Profit (simple calculation)
    const profit = (monthlySales?.paid || 0) - (monthlyExpenses?.total || 0) - (monthlyPurchases?.total || 0);

    return NextResponse.json({
      todaySales: Number(todaySales?.total) || 0,
      todayInvoices: Number(todaySales?.count) || 0,
      monthlySales: Number(monthlySales?.total) || 0,
      monthlyInvoices: Number(monthlySales?.count) || 0,
      yearlySales: Number(yearlySales?.total) || 0,
      yearlyInvoices: Number(yearlySales?.count) || 0,
      totalOutstanding: Number(outstanding?.total) || 0,
      pendingInvoicesCount: Number(outstanding?.count) || 0,
      monthlyExpenses: Number(monthlyExpenses?.total) || 0,
      monthlyPurchases: Number(monthlyPurchases?.total) || 0,
      cashBalance: Number(cashBalance?.debit || 0) - Number(cashBalance?.credit || 0),
      profit: Number(profit) || 0,
      growthPercent: parseFloat(growthPercent.toFixed(1)),
      totalCustomers: Number(counts?.totalCustomers) || 0,
      totalInvoices: Number(invoiceCounts?.totalInvoices) || 0,
      totalQuotations: Number(invoiceCounts?.totalQuotations) || 0,
      pendingInvoices: Number(invoiceCounts?.pendingInvoices) || 0,
      monthlyRevenue,
      recentInvoices,
      pendingPayments,
      creditAlerts,
      topCustomers,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}