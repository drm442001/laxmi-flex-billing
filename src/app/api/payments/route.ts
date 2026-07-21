import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { payments, estimates } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const estimateId = searchParams.get("estimateId");
    const customerId = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(payments.isDeleted, false)];
    if (estimateId) conditions.push(eq(payments.estimateId, parseInt(estimateId)));
    if (customerId) conditions.push(eq(payments.customerId, parseInt(customerId)));
    if (from) conditions.push(gte(payments.paymentDate, from));
    if (to) conditions.push(lte(payments.paymentDate, to));

    const result = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        estimateId: payments.estimateId,
        customerId: payments.customerId,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        referenceNumber: payments.referenceNumber,
        bankName: payments.bankName,
        chequeNumber: payments.chequeNumber,
        chequeDate: payments.chequeDate,
        notes: payments.notes,
        paymentDate: payments.paymentDate,
        createdAt: payments.createdAt,
        invoiceNumber: estimates.invoiceNumber,
        customerName: estimates.customerName,
      })
      .from(payments)
      .leftJoin(estimates, eq(payments.estimateId, estimates.id))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "payment.create");
  if (authP instanceof Response) return authP;
  const body = await req.json();
  if (!body.estimateId || typeof body.estimateId !== "number") {
    return NextResponse.json({ error: "Valid invoice ID is required" }, { status: 400 });
  }
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Get estimate
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, body.estimateId));
    if (!estimate) {
      client.release();
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { estimateId, amount, paymentMethod, referenceNumber, bankName, chequeNumber, chequeDate, notes, paymentDate } = body;
    const payDate = paymentDate || new Date().toISOString().split("T")[0];

    await client.query("BEGIN");

    // Generate payment number
    const countRes = await client.query("SELECT count(*)::int as count FROM payments");
    const paymentNumber = `PAY-${(countRes.rows[0].count + 1).toString().padStart(5, "0")}`;

    // Insert payment
    const payRes = await client.query(
      `INSERT INTO payments (payment_number, estimate_id, customer_id, amount, payment_method, reference_number, bank_name, cheque_number, cheque_date, notes, payment_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [paymentNumber, estimateId, estimate.customerId, amount, paymentMethod || "cash", referenceNumber || null, bankName || null, chequeNumber || null, chequeDate || null, notes || null, payDate]
    );
    const payment = payRes.rows[0];

    // Update estimate
    const newPaid = (estimate.paidAmount || 0) + amount;
    const newBal = estimate.grandTotal - newPaid;
    const payStatus = newPaid >= estimate.grandTotal ? "paid" : newPaid > 0 ? "partial" : "unpaid";

    await client.query(
      "UPDATE estimates SET paid_amount=$1, balance_amount=$2, payment_status=$3, updated_at=NOW() WHERE id=$4",
      [newPaid, newBal > 0 ? newBal : 0, payStatus, estimateId]
    );

    // Update customer
    if (estimate.customerId) {
      await client.query(
        "UPDATE customers SET total_paid = total_paid + $1, balance = balance - $1, updated_at = NOW() WHERE id = $2",
        [amount, estimate.customerId]
      );
      // Ledger
      await client.query(
        `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [payDate, "customer", estimate.customerId, estimate.customerName || "Customer", "payment", payment.id, paymentNumber, `Payment for ${estimate.invoiceNumber}`, 0, amount]
      );
    }

    // Cash book
    await client.query(
      `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [payDate, "receipt", "payment", payment.id, paymentNumber, `Payment from ${estimate.customerName || "Customer"} - ${estimate.invoiceNumber}`, amount, 0, paymentMethod || "cash"]
    );

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "payment", payment.id, `Payment ${paymentNumber}: ₹${amount} for ${estimate.invoiceNumber}`);
    return NextResponse.json(payment);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  } finally {
    client.release();
  }
}