import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { purchases } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const vendorId = searchParams.get("vendorId");

    const conditions = [eq(purchases.isDeleted, false)];
    if (from) conditions.push(gte(purchases.purchaseDate, from));
    if (to) conditions.push(lte(purchases.purchaseDate, to));
    if (vendorId) conditions.push(eq(purchases.vendorId, parseInt(vendorId)));

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
  const body = await req.json();
  if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (!body.totalAmount || typeof body.totalAmount !== "number" || body.totalAmount <= 0) {
    return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { vendorId, vendorName, billNumber, billDate, description, quantity, rate, amount, gstAmount, totalAmount, paymentMethod, paidAmount, purchaseDate, notes } = body;
    const purDate = purchaseDate || new Date().toISOString().split("T")[0];
    const balanceAmount = totalAmount - (paidAmount || 0);
    const paymentStatus = (paidAmount || 0) >= totalAmount ? "paid" : (paidAmount || 0) > 0 ? "partial" : "unpaid";

    const countRes = await client.query("SELECT count(*)::int as count FROM purchases");
    const purchaseNumber = `PUR-${(countRes.rows[0].count + 1).toString().padStart(4, "0")}`;

    const purRes = await client.query(
      `INSERT INTO purchases (purchase_number,vendor_id,vendor_name,bill_number,bill_date,description,quantity,rate,amount,gst_amount,total_amount,payment_method,paid_amount,balance_amount,payment_status,purchase_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [purchaseNumber, vendorId || null, vendorName || "", billNumber || null, billDate || null, description, quantity || 1, rate || 0, amount || 0, gstAmount || 0, totalAmount, paymentMethod || "cash", paidAmount || 0, balanceAmount, paymentStatus, purDate, notes || null]
    );
    const purchase = purRes.rows[0];

    // Cash book if paid
    if ((paidAmount || 0) > 0) {
      await client.query(
        `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [purDate, "payment", "purchase", purchase.id, purchaseNumber, `Purchase: ${description}`, 0, paidAmount, paymentMethod || "cash"]
      );
    }

    // Ledger
    await client.query(
      `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [purDate, "vendor", vendorId || null, vendorName || "Vendor", "purchase", purchase.id, purchaseNumber, description, totalAmount, paidAmount || 0]
    );

    // Update vendor balance
    if (vendorId) {
      await client.query("UPDATE vendors SET balance = balance + $1, updated_at = NOW() WHERE id = $2", [balanceAmount, vendorId]);
    }

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "purchase", purchase.id, `Purchase ${purchaseNumber}: ₹${totalAmount}`);
    return NextResponse.json(purchase);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating purchase:", error);
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  } finally {
    client.release();
  }
}