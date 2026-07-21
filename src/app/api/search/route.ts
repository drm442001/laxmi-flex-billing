import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, customers, expenses, purchases } from "@/db/schema";
import { ilike, or, eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const type = searchParams.get("type");

    if (!query || query.length < 2) {
      return NextResponse.json({ invoices: [], quotations: [], customers: [], expenses: [], purchases: [] });
    }

    const p = `%${query}%`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any[]> = {
      invoices: [],
      quotations: [],
      customers: [],
      expenses: [],
      purchases: [],
    };

    // Invoices
    if (!type || type === "all" || type === "invoices") {
      results.invoices = await db
        .select()
        .from(estimates)
        .where(and(eq(estimates.isDeleted, false), eq(estimates.type, "invoice"), or(ilike(estimates.invoiceNumber, p), ilike(estimates.customerName, p), ilike(estimates.customerPhone, p))))
        .orderBy(desc(estimates.createdAt))
        .limit(10);
    }

    // Quotations
    if (!type || type === "all" || type === "quotations") {
      results.quotations = await db
        .select()
        .from(estimates)
        .where(and(eq(estimates.isDeleted, false), eq(estimates.type, "quotation"), or(ilike(estimates.invoiceNumber, p), ilike(estimates.customerName, p), ilike(estimates.customerPhone, p))))
        .orderBy(desc(estimates.createdAt))
        .limit(10);
    }

    // Customers
    if (!type || type === "all" || type === "customers") {
      results.customers = await db
        .select()
        .from(customers)
        .where(and(eq(customers.isDeleted, false), or(ilike(customers.name, p), ilike(customers.phone, p), ilike(customers.email, p), ilike(customers.gstNumber, p))))
        .orderBy(desc(customers.createdAt))
        .limit(10);
    }

    // Expenses
    if (!type || type === "all" || type === "expenses") {
      results.expenses = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.isDeleted, false), or(ilike(expenses.description, p), ilike(expenses.expenseNumber, p), ilike(expenses.vendorName, p), ilike(expenses.categoryName, p))))
        .orderBy(desc(expenses.expenseDate))
        .limit(10);
    }

    // Purchases
    if (!type || type === "all" || type === "purchases") {
      results.purchases = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.isDeleted, false), or(ilike(purchases.description, p), ilike(purchases.purchaseNumber, p), ilike(purchases.vendorName, p))))
        .orderBy(desc(purchases.purchaseDate))
        .limit(10);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}