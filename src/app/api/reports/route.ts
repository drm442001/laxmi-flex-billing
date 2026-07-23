import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, payments, expenses, purchases, customers, estimateItems } from "@/db/schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "reports.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const reportType = searchParams.get("type") || "daily";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];

    let dateFrom = from || today;
    const dateTo = to || today;

    if (!from) {
      if (reportType === "monthly") dateFrom = startOfMonth;
      else if (reportType === "yearly") dateFrom = startOfYear;
    }

    const dateFilter = and(
      eq(estimates.isDeleted, false),
      gte(estimates.invoiceDate, dateFrom),
      lte(estimates.invoiceDate, dateTo)
    );

    const [salesData] = await db
      .select({
        totalInvoices: sql<number>`count(*) filter (where ${estimates.type} = 'invoice')`,
        totalSales: sql<number>`coalesce(sum(${estimates.grandTotal}) filter (where ${estimates.type} = 'invoice'), 0)`,
        totalPaid: sql<number>`coalesce(sum(${estimates.paidAmount}) filter (where ${estimates.type} = 'invoice'), 0)`,
        totalPending: sql<number>`coalesce(sum(${estimates.balanceAmount}) filter (where ${estimates.type} = 'invoice'), 0)`,
        totalQuotations: sql<number>`count(*) filter (where ${estimates.type} = 'quotation')`,
        quotationValue: sql<number>`coalesce(sum(${estimates.grandTotal}) filter (where ${estimates.type} = 'quotation'), 0)`,
      })
      .from(estimates)
      .where(dateFilter);

    const [paymentsData] = await db
      .select({
        totalPayments: sql<number>`count(*)`,
        totalAmount: sql<number>`coalesce(sum(${payments.amount}), 0)`,
        cashAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.paymentMethod} = 'cash'), 0)`,
        upiAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.paymentMethod} = 'upi'), 0)`,
        bankAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.paymentMethod} = 'bank'), 0)`,
        chequeAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.paymentMethod} = 'cheque'), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.isDeleted, false), gte(payments.paymentDate, dateFrom), lte(payments.paymentDate, dateTo)));

    const [expensesData] = await db
      .select({
        totalExpenses: sql<number>`count(*)`,
        totalAmount: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(eq(expenses.isDeleted, false), gte(expenses.expenseDate, dateFrom), lte(expenses.expenseDate, dateTo)));

    const [purchasesData] = await db
      .select({
        totalPurchases: sql<number>`count(*)`,
        totalAmount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)`,
        totalPaid: sql<number>`coalesce(sum(${purchases.paidAmount}), 0)`,
        totalPending: sql<number>`coalesce(sum(${purchases.balanceAmount}), 0)`,
      })
      .from(purchases)
      .where(and(eq(purchases.isDeleted, false), gte(purchases.purchaseDate, dateFrom), lte(purchases.purchaseDate, dateTo)));

    const topCustomers = await db
      .select({ id: customers.id, name: customers.name, totalBusiness: customers.totalBusiness, balance: customers.balance })
      .from(customers)
      .where(eq(customers.isDeleted, false))
      .orderBy(desc(customers.totalBusiness))
      .limit(10);

    const topItems = await db
      .select({
        description: estimateItems.description,
        count: sql<number>`count(*)`,
        totalQty: sql<number>`coalesce(sum(${estimateItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${estimateItems.amount}), 0)`,
      })
      .from(estimateItems)
      .innerJoin(estimates, eq(estimateItems.estimateId, estimates.id))
      .where(
        and(
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice"),
          gte(estimates.invoiceDate, dateFrom),
          lte(estimates.invoiceDate, dateTo)
        )
      )
      .groupBy(estimateItems.description)
      .orderBy(desc(sql`coalesce(sum(${estimateItems.amount}), 0)`))
      .limit(10);

    const pendingPayments = await db
      .select({
        id: estimates.id,
        invoiceNumber: estimates.invoiceNumber,
        customerName: estimates.customerName,
        grandTotal: estimates.grandTotal,
        paidAmount: estimates.paidAmount,
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
      .limit(20);

    const profit = Number(salesData?.totalPaid || 0) - Number(expensesData?.totalAmount || 0) - Number(purchasesData?.totalPaid || 0);

    const numSales = salesData ? {
      totalInvoices: Number(salesData.totalInvoices) || 0,
      totalSales: Number(salesData.totalSales) || 0,
      totalPaid: Number(salesData.totalPaid) || 0,
      totalPending: Number(salesData.totalPending) || 0,
      totalQuotations: Number(salesData.totalQuotations) || 0,
      quotationValue: Number(salesData.quotationValue) || 0,
    } : { totalInvoices: 0, totalSales: 0, totalPaid: 0, totalPending: 0, totalQuotations: 0, quotationValue: 0 };

    const numPayments = paymentsData ? {
      totalPayments: Number(paymentsData.totalPayments) || 0,
      totalAmount: Number(paymentsData.totalAmount) || 0,
      cashAmount: Number(paymentsData.cashAmount) || 0,
      upiAmount: Number(paymentsData.upiAmount) || 0,
      bankAmount: Number(paymentsData.bankAmount) || 0,
      chequeAmount: Number(paymentsData.chequeAmount) || 0,
    } : { totalPayments: 0, totalAmount: 0, cashAmount: 0, upiAmount: 0, bankAmount: 0, chequeAmount: 0 };

    const numExpenses = expensesData ? {
      totalExpenses: Number(expensesData.totalExpenses) || 0,
      totalAmount: Number(expensesData.totalAmount) || 0,
    } : { totalExpenses: 0, totalAmount: 0 };

    const numPurchases = purchasesData ? {
      totalPurchases: Number(purchasesData.totalPurchases) || 0,
      totalAmount: Number(purchasesData.totalAmount) || 0,
      totalPaid: Number(purchasesData.totalPaid) || 0,
      totalPending: Number(purchasesData.totalPending) || 0,
    } : { totalPurchases: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 };

    return NextResponse.json({
      period: { from: dateFrom, to: dateTo, type: reportType },
      sales: numSales,
      payments: numPayments,
      expenses: numExpenses,
      purchases: numPurchases,
      profit: Number(profit) || 0,
      topCustomers,
      topItems,
      pendingPayments,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
