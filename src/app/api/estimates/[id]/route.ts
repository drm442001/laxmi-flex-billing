import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { estimates, estimateItems, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { numberToWords } from "@/lib/constants";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const estimateId = parseId(id);
    if (!Number.isFinite(estimateId) || estimateId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const [estimate] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, estimateId));

    if (!estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, estimateId))
      .orderBy(estimateItems.srNo);

    return NextResponse.json({ ...estimate, items });
  } catch (error) {
    console.error("Error fetching estimate:", error);
    return NextResponse.json({ error: "Failed to fetch estimate" }, { status: 500 });
  }
}

function sanitizeItems(items: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(items)) return null;
  if (items.length === 0) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    if (typeof item.description !== "string" || !item.description.trim()) return null;
    if (typeof item.category !== "string") return null;
    const quantity = typeof item.quantity === "number" && isFinite(item.quantity) ? Math.max(0, item.quantity) : 1;
    const rate = typeof item.rate === "number" && isFinite(item.rate) ? Math.max(0, item.rate) : 0;
    const amount = typeof item.amount === "number" && isFinite(item.amount) ? Math.max(0, item.amount) : rate * quantity;
    out.push({
      category: item.category.slice(0, 32),
      description: item.description.slice(0, 200),
      hsnCode: typeof item.hsnCode === "string" ? item.hsnCode.slice(0, 16) : null,
      width: typeof item.width === "number" && isFinite(item.width) ? item.width : null,
      wSupport: typeof item.wSupport === "number" && isFinite(item.wSupport) ? item.wSupport : null,
      height: typeof item.height === "number" && isFinite(item.height) ? item.height : null,
      hSupport: typeof item.hSupport === "number" && isFinite(item.hSupport) ? item.hSupport : null,
      size: typeof item.size === "string" ? item.size.slice(0, 64) : null,
      quantity,
      totalFit: typeof item.totalFit === "number" && isFinite(item.totalFit) ? Math.max(0, item.totalFit) : 0,
      unit: typeof item.unit === "string" ? item.unit.slice(0, 20) : "",
      rate,
      amount,
      gstPercent: typeof item.gstPercent === "number" && isFinite(item.gstPercent) ? Math.max(0, Math.min(100, item.gstPercent)) : 0,
      gstAmount: typeof item.gstAmount === "number" && isFinite(item.gstAmount) ? Math.max(0, item.gstAmount) : 0,
    });
  }
  return out;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authP = await requirePermission(req, "invoice.edit");
  if (authP instanceof Response) return authP;

  let client;
  try {
    const { id } = await params;
    const estimateId = parseId(id);
    if (!Number.isFinite(estimateId) || estimateId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const curRes = await client.query("SELECT * FROM estimates WHERE id = $1 FOR UPDATE", [estimateId]);
    const current = curRes.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const paidAmount = Number(current.paid_amount || 0);
    const providedGrandTotal = typeof body.grandTotal === "number" && isFinite(body.grandTotal) ? body.grandTotal : Number(current.grandTotal);
    if (providedGrandTotal < 0) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "Grand total cannot be negative" }, { status: 400 });
    }
    // Prevent editing total below what's already paid (would corrupt balance)
    if (providedGrandTotal < paidAmount - 0.01) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json(
        { error: `Cannot reduce total below amount already paid (₹${paidAmount.toFixed(2)}). Delete/adjust payments first.` },
        { status: 400 }
      );
    }
    const grandTotal = Number(providedGrandTotal.toFixed(2));
    const newBalance = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));
    let paymentStatus: string = "unpaid";
    if (paidAmount >= grandTotal - 0.005) paymentStatus = "paid";
    else if (paidAmount > 0) paymentStatus = "partial";

    const amountInWords = numberToWords(grandTotal);

    await client.query(
      `UPDATE estimates SET
        type = $1, invoice_type = $2, invoice_number = $3,
        financial_year = $4, customer_id = $5, customer_name = $6,
        customer_phone = $7, customer_address = $8, customer_gst = $9,
        customer_state = $10, invoice_date = $11, due_date = $12,
        subtotal = $13, discount_percent = $14, discount_amount = $15,
        taxable_amount = $16, cgst_percent = $17, cgst_amount = $18,
        sgst_percent = $19, sgst_amount = $20, igst_percent = $21,
        igst_amount = $22, gst_percent = $23, gst_amount = $24,
        round_off = $25, grand_total = $26, amount_in_words = $27,
        balance_amount = $28, payment_status = $29,
        notes = $30, terms_conditions = $31, status = $32,
        updated_at = NOW(), updated_by = $33
      WHERE id = $34`,
      [
        body.type ?? current.type,
        body.invoiceType ?? current.invoice_type,
        body.invoiceNumber ?? current.invoice_number,
        body.financialYear ?? current.financial_year,
        body.customerId ?? current.customerId,
        body.customerName ?? current.customer_name ?? "",
        body.customerPhone ?? current.customer_phone ?? "",
        body.customerAddress ?? current.customer_address ?? "",
        body.customerGst ?? current.customer_gst,
        body.customerState ?? current.customer_state,
        body.invoiceDate ?? current.invoice_date,
        body.dueDate ?? current.due_date,
        body.subtotal ?? current.subtotal,
        body.discountPercent ?? current.discount_percent ?? 0,
        body.discountAmount ?? current.discount_amount ?? 0,
        body.taxableAmount ?? current.taxable_amount ?? 0,
        body.cgstPercent ?? current.cgst_percent ?? 0,
        body.cgstAmount ?? current.cgst_amount ?? 0,
        body.sgstPercent ?? current.sgst_percent ?? 0,
        body.sgstAmount ?? current.sgst_amount ?? 0,
        body.igstPercent ?? current.igst_percent ?? 0,
        body.igstAmount ?? current.igst_amount ?? 0,
        body.gstPercent ?? current.gst_percent ?? 0,
        body.gstAmount ?? current.gst_amount ?? 0,
        body.roundOff ?? current.round_off ?? 0,
        grandTotal,
        amountInWords,
        newBalance,
        paymentStatus,
        body.notes ?? current.notes ?? "",
        body.termsConditions ?? current.terms_conditions ?? "",
        body.status ?? current.status ?? "saved",
        authP.id,
        estimateId,
      ]
    );

    // If items provided, replace them
    if (body.items !== undefined) {
      await client.query("DELETE FROM estimate_items WHERE estimate_id = $1", [estimateId]);
      const safeItems = sanitizeItems(body.items);
      if (safeItems === null) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json({ error: "Invalid items payload" }, { status: 400 });
      }
      if (safeItems.length > 0) {
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let idx = 1;
        for (let i = 0; i < safeItems.length; i++) {
          const item = safeItems[i];
          placeholders.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
          values.push(
            estimateId, i + 1, item.category, item.description,
            item.hsnCode, item.width, item.wSupport,
            item.height, item.hSupport, item.size,
            item.quantity, item.totalFit, item.unit,
            item.rate, item.amount,
            item.gstPercent, item.gstAmount
          );
        }
        await client.query(
          `INSERT INTO estimate_items (estimate_id, sr_no, category, description, hsn_code, width, w_support, height, h_support, size, quantity, total_fit, unit, rate, amount, gst_percent, gst_amount) VALUES ${placeholders.join(",")}`,
          values
        );
      }
    }

    // Adjust customer balance if grandTotal changed on an invoice
    const diff = Number((grandTotal - Number(current.grandTotal)).toFixed(2));
    if (diff !== 0 && current.type === "invoice" && current.customerId) {
      await client.query(
        "UPDATE customers SET balance = balance + $1, total_business = total_business + $1, updated_at = NOW() WHERE id = $2",
        [diff, current.customerId]
      );
    }

    await client.query("COMMIT");
    client.release();

    const [updated] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
    await logActivity(authP.id, "edit", "invoice", estimateId, `Updated: ${updated?.invoiceNumber}`);
    return NextResponse.json(updated);
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
    }
    console.error("Error updating estimate:", error);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}

// Soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authD = await requirePermission(_req, "invoice.delete");
  if (authD instanceof Response) return authD;
  try {
    const { id } = await params;
    const estimateId = parseId(id);
    if (!Number.isFinite(estimateId) || estimateId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [current] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Block delete if payments recorded (avoid corrupted balances)
    if (Number(current.paidAmount) > 0) {
      return NextResponse.json(
        { error: "Cannot delete invoice with recorded payments. Delete payments first." },
        { status: 400 }
      );
    }

    // Reverse customer balance if it was an invoice (use drizzle column refs for safety).
    if (current.type === "invoice" && current.customerId) {
      const adj = Number(current.grandTotal) || 0;
      const [cust] = await db.select({ balance: customers.balance, totalBusiness: customers.totalBusiness })
        .from(customers).where(eq(customers.id, current.customerId));
      if (cust) {
        await db
          .update(customers)
          .set({
            balance: Math.max(0, Number(cust.balance || 0) - adj),
            totalBusiness: Math.max(0, Number(cust.totalBusiness || 0) - adj),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, current.customerId));
      }
    }

    await db
      .update(estimates)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: authD.id,
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, estimateId));

    await logActivity(authD.id, "delete", "invoice", estimateId, `Deleted invoice #${estimateId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}
