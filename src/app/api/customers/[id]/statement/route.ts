import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, estimates, payments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, parseId } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const customerId = parseId(id);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const invoiceConds = [
      eq(estimates.customerId, customerId),
      eq(estimates.isDeleted, false),
      eq(estimates.type, "invoice"),
    ];
    const invoices = await db
      .select({
        id: estimates.id,
        invoiceNumber: estimates.invoiceNumber,
        type: estimates.type,
        grandTotal: estimates.grandTotal,
        paidAmount: estimates.paidAmount,
        balanceAmount: estimates.balanceAmount,
        paymentStatus: estimates.paymentStatus,
        invoiceDate: estimates.invoiceDate,
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .where(and(...invoiceConds))
      .orderBy(desc(estimates.invoiceDate));

    const paymentConds = [
      eq(payments.customerId, customerId),
      eq(payments.isDeleted, false),
    ];
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
      .where(and(...paymentConds))
      .orderBy(desc(payments.paymentDate));

    interface StatementEntry {
      date: string;
      type: "invoice" | "payment";
      description: string;
      debit: number;
      credit: number;
      reference: string;
    }

    const entries: StatementEntry[] = [];

    const toDateStr = (d: unknown): string => {
      if (!d) return "";
      if (d instanceof Date) return d.toISOString().split("T")[0];
      if (typeof d === "string") return d.split("T")[0];
      return String(d);
    };
    const toDateTimeStr = (d: unknown): string => {
      if (!d) return "";
      if (d instanceof Date) return d.toISOString();
      return String(d);
    };

    for (const inv of invoices) {
      const invDate = inv.invoiceDate ? toDateStr(inv.invoiceDate) : toDateStr(inv.createdAt);
      if (from && invDate && invDate < from) continue;
      if (to && invDate && invDate > to) continue;

      entries.push({
        date: invDate || toDateTimeStr(inv.createdAt),
        type: "invoice",
        description: `Invoice #${inv.invoiceNumber}`,
        debit: Number(inv.grandTotal) || 0,
        credit: 0,
        reference: inv.invoiceNumber || "",
      });
    }

    for (const pay of customerPayments) {
      const payDate = pay.paymentDate ? toDateStr(pay.paymentDate) : toDateStr(pay.createdAt);
      if (from && payDate && payDate < from) continue;
      if (to && payDate && payDate > to) continue;

      const invoice = invoices.find((i) => i.id === pay.estimateId);
      entries.push({
        date: payDate || toDateTimeStr(pay.createdAt),
        type: "payment",
        description: `Payment (${pay.paymentMethod})${pay.referenceNumber ? ` - ${pay.referenceNumber}` : ""}`,
        debit: 0,
        credit: Number(pay.amount) || 0,
        reference: invoice?.invoiceNumber || "",
      });
    }

    entries.sort((a, b) => {
      const at = new Date(a.date).getTime();
      const bt = new Date(b.date).getTime();
      if (at !== bt) return at - bt;
      return a.type === "invoice" ? -1 : 1; // invoices before payments on same day
    });

    let runningBalance = Number(customer.openingBalance) || 0;
    const statementWithBalance = entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, balance: Number(runningBalance.toFixed(2)) };
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
        openingBalance: Number(customer.openingBalance) || 0,
      },
      entries: statementWithBalance,
      summary: {
        totalInvoices: invoices.length,
        totalDebit,
        totalCredit,
        balance: runningBalance,
      },
      period: { from, to },
    });
  } catch (error) {
    console.error("Error generating statement:", error);
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}
