import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { expenses } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requirePermission, logActivity, parseId } from "@/lib/auth";

const VALID_PAYMENT_METHODS = new Set(["cash", "upi", "bank", "cheque", "other"]);

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryIdRaw = searchParams.get("categoryId");

    const conditions: ReturnType<typeof eq>[] = [eq(expenses.isDeleted, false)];
    if (from) conditions.push(gte(expenses.expenseDate, from));
    if (to) conditions.push(lte(expenses.expenseDate, to));
    if (categoryIdRaw) {
      const cid = parseId(categoryIdRaw);
      if (!Number.isFinite(cid) || cid <= 0) return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
      conditions.push(eq(expenses.categoryId, cid));
    }

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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (description.length > 200) {
    return NextResponse.json({ error: "Description too long" }, { status: 400 });
  }
  const amount = typeof body.amount === "number" && isFinite(body.amount) ? body.amount : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  const paymentMethod = typeof body.paymentMethod === "string" && VALID_PAYMENT_METHODS.has(body.paymentMethod)
    ? body.paymentMethod : "cash";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const categoryId = parseId(body.categoryId);
    const categoryName = typeof body.categoryName === "string" ? body.categoryName.slice(0, 80) : "";
    const vendorName = typeof body.vendorName === "string" ? body.vendorName.slice(0, 120) : "";
    const referenceNumber = typeof body.referenceNumber === "string" ? body.referenceNumber.slice(0, 64) : null;
    const billNumber = typeof body.billNumber === "string" ? body.billNumber.slice(0, 64) : null;
    const expenseDate = typeof body.expenseDate === "string" && body.expenseDate ? body.expenseDate : new Date().toISOString().split("T")[0];
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

    const countRes = await client.query("SELECT count(*)::int as count FROM expenses");
    const expenseNumber = `EXP-${(countRes.rows[0].count + 1).toString().padStart(4, "0")}`;

    const expRes = await client.query(
      `INSERT INTO expenses (expense_number,category_id,category_name,vendor_name,description,amount,payment_method,reference_number,bill_number,expense_date,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [expenseNumber, Number.isFinite(categoryId) ? categoryId : null, categoryName, vendorName, description,
       amount, paymentMethod, referenceNumber, billNumber, expenseDate, notes, authP.id]
    );
    const expense = expRes.rows[0];

    await client.query(
      `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [expenseDate, "payment", "expense", expense.id, expenseNumber, `Expense: ${description}`, 0, amount, paymentMethod, authP.id]
    );

    await client.query(
      `INSERT INTO ledger_entries (entry_date,account_type,account_name,reference_type,reference_id,reference_number,particulars,debit,credit,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [expenseDate, "expense", categoryName || "Expense", "expense", expense.id, expenseNumber, description, amount, 0, authP.id]
    );

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "expense", expense.id, `Expense ${expenseNumber}: ₹${amount}`);
    return NextResponse.json(expense);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  } finally {
    client.release();
  }
}
