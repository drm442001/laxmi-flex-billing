import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { expenses } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryId = searchParams.get("categoryId");

    const conditions = [eq(expenses.isDeleted, false)];
    if (from) conditions.push(gte(expenses.expenseDate, from));
    if (to) conditions.push(lte(expenses.expenseDate, to));
    if (categoryId) conditions.push(eq(expenses.categoryId, parseInt(categoryId)));

    const result = await db
      .select().from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "expense.create");
  if (authP instanceof Response) return authP;
  const body = await req.json();
  if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { categoryId, categoryName, vendorName, description, amount, paymentMethod, referenceNumber, billNumber, expenseDate, notes } = body;
    const expDate = expenseDate || new Date().toISOString().split("T")[0];

    const countRes = await client.query("SELECT count(*)::int as count FROM expenses");
    const expenseNumber = `EXP-${(countRes.rows[0].count + 1).toString().padStart(4, "0")}`;

    const expRes = await client.query(
      `INSERT INTO expenses (expense_number,category_id,category_name,vendor_name,description,amount,payment_method,reference_number,bill_number,expense_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [expenseNumber, categoryId || null, categoryName || "", vendorName || "", description, amount, paymentMethod || "cash", referenceNumber || null, billNumber || null, expDate, notes || null]
    );
    const expense = expRes.rows[0];

    // Cash book
    await client.query(
      `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [expDate, "payment", "expense", expense.id, expenseNumber, `Expense: ${description}`, 0, amount, paymentMethod || "cash"]
    );

    // Ledger
    await client.query(
      `INSERT INTO ledger_entries (entry_date,account_type,account_name,reference_type,reference_id,reference_number,particulars,debit,credit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [expDate, "expense", categoryName || "Expense", "expense", expense.id, expenseNumber, description, amount, 0]
    );

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "expense", expense.id, `Expense ${expenseNumber}: ₹${amount}`);
    return NextResponse.json(expense);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  } finally {
    client.release();
  }
}