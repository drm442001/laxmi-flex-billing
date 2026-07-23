import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { purchases } from "@/db/schema";
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
    const vendorIdRaw = searchParams.get("vendorId");

    const conditions: ReturnType<typeof eq>[] = [eq(purchases.isDeleted, false)];
    if (from) conditions.push(gte(purchases.purchaseDate, from));
    if (to) conditions.push(lte(purchases.purchaseDate, to));
    if (vendorIdRaw) {
      const vid = parseId(vendorIdRaw);
      if (!Number.isFinite(vid) || vid <= 0) return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
      conditions.push(eq(purchases.vendorId, vid));
    }

    const result = await db.select().from(purchases).where(and(...conditions)).orderBy(desc(purchases.purchaseDate));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "purchase.create");
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
  const totalAmount = typeof body.totalAmount === "number" && isFinite(body.totalAmount) ? body.totalAmount : NaN;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 });
  }
  const paymentMethod = typeof body.paymentMethod === "string" && VALID_PAYMENT_METHODS.has(body.paymentMethod)
    ? body.paymentMethod : "cash";
  const paidAmount = typeof body.paidAmount === "number" && isFinite(body.paidAmount) ? Math.max(0, body.paidAmount) : 0;
  if (paidAmount > totalAmount + 0.01) {
    return NextResponse.json({ error: "Paid amount cannot exceed total amount" }, { status: 400 });
  }

  const vendorId = parseId(body.vendorId);
  const vendorName = typeof body.vendorName === "string" ? body.vendorName.slice(0, 120) : "";
  const billNumber = typeof body.billNumber === "string" ? body.billNumber.slice(0, 64) : null;
  const billDate = typeof body.billDate === "string" ? body.billDate : null;
  const quantity = typeof body.quantity === "number" && isFinite(body.quantity) ? Math.max(0, body.quantity) : 1;
  const rate = typeof body.rate === "number" && isFinite(body.rate) ? Math.max(0, body.rate) : 0;
  const amount = typeof body.amount === "number" && isFinite(body.amount) ? Math.max(0, body.amount) : 0;
  const gstAmount = typeof body.gstAmount === "number" && isFinite(body.gstAmount) ? Math.max(0, body.gstAmount) : 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const purDate = typeof body.purchaseDate === "string" && body.purchaseDate
      ? body.purchaseDate : new Date().toISOString().split("T")[0];
    const balanceAmount = Number((totalAmount - paidAmount).toFixed(2));
    const paymentStatus = paidAmount >= totalAmount - 0.005 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

    const countRes = await client.query("SELECT count(*)::int as count FROM purchases");
    const purchaseNumber = `PUR-${(countRes.rows[0].count + 1).toString().padStart(4, "0")}`;

    const purRes = await client.query(
      `INSERT INTO purchases (purchase_number,vendor_id,vendor_name,bill_number,bill_date,description,quantity,rate,amount,gst_amount,total_amount,payment_method,paid_amount,balance_amount,payment_status,purchase_date,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [purchaseNumber, Number.isFinite(vendorId) ? vendorId : null, vendorName, billNumber, billDate,
       description, quantity, rate, amount, gstAmount, totalAmount, paymentMethod, paidAmount, balanceAmount,
       paymentStatus, purDate, notes, authP.id]
    );
    const purchase = purRes.rows[0];

    if (paidAmount > 0) {
      await client.query(
        `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [purDate, "payment", "purchase", purchase.id, purchaseNumber, `Purchase: ${description}`, 0, paidAmount, paymentMethod, authP.id]
      );
    }

    // Ledger: purchases are expense (debit) and payments reduce vendor payable.
    await client.query(
      `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [purDate, "vendor", Number.isFinite(vendorId) ? vendorId : null, vendorName || "Vendor",
       "purchase", purchase.id, purchaseNumber, description, totalAmount, paidAmount, authP.id]
    );

    if (Number.isFinite(vendorId)) {
      await client.query("UPDATE vendors SET balance = balance + $1, updated_at = NOW() WHERE id = $2", [balanceAmount, vendorId]);
    }

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "purchase", purchase.id, `Purchase ${purchaseNumber}: ₹${totalAmount}`);
    return NextResponse.json(purchase);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error creating purchase:", error);
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  } finally {
    client.release();
  }
}
