import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, estimates, payments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Get customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get all invoices
    const invoices = await db
      .select({
        id: estimates.id,
        invoiceNumber: estimates.invoiceNumber,
        type: estimates.type,
        grandTotal: estimates.grandTotal,
        paidAmount: estimates.paidAmount,
        balanceAmount: estimates.balanceAmount,
        paymentStatus: estimates.paymentStatus,
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.customerId, customerId),
          eq(estimates.isDeleted, false),
          eq(estimates.type, "invoice")
        )
      )
      .orderBy(desc(estimates.createdAt));

    // Get all payments
    const customerPayments = await db
      .select({
        id: payments.id,
        estimateId: payments.estimateId,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        referenceNumber: payments.referenceNumber,
        paymentDate: payments.paymentDate,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.createdAt));

    // Build statement entries (combined and sorted)
    interface StatementEntry {
      date: string;
      type: "invoice" | "payment";
      description: string;
      debit: number;
      credit: number;
      reference: string;
    }

    const entries: StatementEntry[] = [];

    // Add invoices as debits
    for (const inv of invoices) {
      entries.push({
        date: inv.createdAt?.toISOString() || "",
        type: "invoice",
        description: `Invoice #${inv.invoiceNumber}`,
        debit: inv.grandTotal,
        credit: 0,
        reference: inv.invoiceNumber,
      });
    }

    // Add payments as credits
    for (const pay of customerPayments) {
      const invoice = invoices.find((i) => i.id === pay.estimateId);
      entries.push({
        date: pay.paymentDate || pay.createdAt?.toISOString() || "",
        type: "payment",
        description: `Payment (${pay.paymentMethod})${pay.referenceNumber ? ` - ${pay.referenceNumber}` : ""}`,
        debit: 0,
        credit: pay.amount,
        reference: invoice?.invoiceNumber || "",
      });
    }

    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const statementWithBalance = entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    // Calculate totals
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
      },
      entries: statementWithBalance,
      summary: {
        totalInvoices: invoices.length,
        totalDebit,
        totalCredit,
        balance: totalDebit - totalCredit,
      },
      period: { from, to },
    });
  } catch (error) {
    console.error("Error generating statement:", error);
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}