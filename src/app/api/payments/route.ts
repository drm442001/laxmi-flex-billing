import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { payments, estimates } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

const VALID_PAYMENT_METHODS = new Set(["cash", "upi", "bank", "cheque", "other"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const estimateIdRaw = searchParams.get("estimateId");
    const customerIdRaw = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions: ReturnType<typeof eq>[] = [eq(payments.isDeleted, false)];
    if (estimateIdRaw) {
      const eid = parseId(estimateIdRaw);
      if (!Number.isFinite(eid) || eid <= 0) return NextResponse.json({ error: "Invalid estimateId" }, { status: 400 });
      conditions.push(eq(payments.estimateId, eid));
    }
    if (customerIdRaw) {
      const cid = parseId(customerIdRaw);
      if (!Number.isFinite(cid) || cid <= 0) return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
      conditions.push(eq(payments.customerId, cid));
    }
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const estimateId = parseId(body.estimateId);
  if (!Number.isFinite(estimateId) || estimateId <= 0) {
    return NextResponse.json({ error: "Valid invoice ID is required" }, { status: 400 });
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
    // Lock the estimate row to prevent concurrent over-payment.
    const estRes = await client.query(
      `SELECT id, customer_id, customer_name, invoice_number, grand_total, paid_amount, balance_amount, payment_status, is_deleted
       FROM estimates WHERE id = $1 FOR UPDATE`,
      [estimateId]
    );
    const estimate = estRes.rows[0];
    if (!estimate || estimate.is_deleted) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const outstanding = Math.max(0, Number(estimate.grand_total) - Number(estimate.paid_amount || 0));
    if (amount > outstanding + 0.01) { // allow tiny rounding tolerance
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json(
        { error: `Payment exceeds outstanding balance (₹${outstanding.toFixed(2)})` },
        { status: 400 }
      );
    }

    const { referenceNumber, bankName, chequeNumber, chequeDate, notes, paymentDate } = body;
    const payDate = (typeof paymentDate === "string" && paymentDate) || new Date().toISOString().split("T")[0];

    const countRes = await client.query("SELECT count(*)::int as count FROM payments");
    const paymentNumber = `PAY-${(countRes.rows[0].count + 1).toString().padStart(5, "0")}`;

    const payRes = await client.query(
      `INSERT INTO payments (payment_number, estimate_id, customer_id, amount, payment_method, reference_number, bank_name, cheque_number, cheque_date, notes, payment_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        paymentNumber, estimateId, estimate.customer_id || null, amount, paymentMethod,
        typeof referenceNumber === "string" ? referenceNumber.slice(0, 64) : null,
        typeof bankName === "string" ? bankName.slice(0, 64) : null,
        typeof chequeNumber === "string" ? chequeNumber.slice(0, 64) : null,
        typeof chequeDate === "string" ? chequeDate : null,
        typeof notes === "string" ? notes.slice(0, 500) : null,
        payDate, authP.id,
      ]
    );
    const payment = payRes.rows[0];

    const newPaid = Number((Number(estimate.paid_amount || 0) + amount).toFixed(2));
    const newBal = Math.max(0, Number((Number(estimate.grand_total) - newPaid).toFixed(2)));
    const payStatus = newPaid >= Number(estimate.grand_total) - 0.005 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

    await client.query(
      "UPDATE estimates SET paid_amount=$1, balance_amount=$2, payment_status=$3, updated_at=NOW() WHERE id=$4",
      [newPaid, newBal, payStatus, estimateId]
    );

    if (estimate.customer_id) {
      await client.query(
        "UPDATE customers SET total_paid = total_paid + $1, balance = GREATEST(0, balance - $1), updated_at = NOW() WHERE id = $2",
        [amount, estimate.customer_id]
      );
      await client.query(
        `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [payDate, "customer", estimate.customer_id, estimate.customer_name || "Customer", "payment", payment.id, paymentNumber,
         `Payment for ${estimate.invoice_number}`, 0, amount, authP.id]
      );
    }

    await client.query(
      `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [payDate, "receipt", "payment", payment.id, paymentNumber,
       `Payment from ${estimate.customer_name || "Customer"} - ${estimate.invoice_number}`,
       amount, 0, paymentMethod, authP.id]
    );

    await client.query("COMMIT");
    await logActivity(authP.id, "create", "payment", payment.id, `Payment ${paymentNumber}: ₹${amount} for ${estimate.invoice_number}`);
    return NextResponse.json(payment);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  } finally {
    client.release();
  }
}
