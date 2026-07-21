import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { estimates, estimateItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { numberToWords } from "@/lib/constants";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const estimateId = parseInt(id);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authP = await requirePermission(req, "invoice.edit");
  if (authP instanceof Response) return authP;
  const client = await pool.connect();
  try {
    const { id } = await params;
    const estimateId = parseInt(id);
    const body = await req.json();

    // Get current estimate to preserve paidAmount
    const [current] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, estimateId));

    if (!current) {
      client.release();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const paidAmount = current.paidAmount || 0;
    const grandTotal = body.grandTotal ?? current.grandTotal;
    const newBalance = grandTotal - paidAmount;
    let paymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
    if (paidAmount >= grandTotal) paymentStatus = "paid";
    else if (paidAmount > 0) paymentStatus = "partial";

    const amountInWords = numberToWords(grandTotal);

    // === BEGIN TRANSACTION ===
    await client.query("BEGIN");

    // Update estimate — ALL fields preserved
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
        updated_at = NOW()
      WHERE id = $33`,
      [
        body.type ?? current.type,
        body.invoiceType ?? current.invoiceType,
        body.invoiceNumber ?? current.invoiceNumber,
        body.financialYear ?? current.financialYear,
        body.customerId ?? current.customerId,
        body.customerName ?? current.customerName ?? "",
        body.customerPhone ?? current.customerPhone ?? "",
        body.customerAddress ?? current.customerAddress ?? "",
        body.customerGst ?? current.customerGst,
        body.customerState ?? current.customerState,
        body.invoiceDate ?? current.invoiceDate,
        body.dueDate ?? current.dueDate,
        body.subtotal ?? current.subtotal,
        body.discountPercent ?? current.discountPercent ?? 0,
        body.discountAmount ?? current.discountAmount ?? 0,
        body.taxableAmount ?? current.taxableAmount ?? 0,
        body.cgstPercent ?? current.cgstPercent ?? 0,
        body.cgstAmount ?? current.cgstAmount ?? 0,
        body.sgstPercent ?? current.sgstPercent ?? 0,
        body.sgstAmount ?? current.sgstAmount ?? 0,
        body.igstPercent ?? current.igstPercent ?? 0,
        body.igstAmount ?? current.igstAmount ?? 0,
        body.gstPercent ?? current.gstPercent ?? 0,
        body.gstAmount ?? current.gstAmount ?? 0,
        body.roundOff ?? current.roundOff ?? 0,
        grandTotal,
        amountInWords,
        newBalance > 0 ? newBalance : 0,
        paymentStatus,
        body.notes ?? current.notes ?? "",
        body.termsConditions ?? current.termsConditions ?? "",
        body.status ?? "saved",
        estimateId,
      ]
    );

    // Delete old items
    await client.query("DELETE FROM estimate_items WHERE estimate_id = $1", [estimateId]);

    // Re-insert items
    const items = body.items;
    if (items && items.length > 0) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        placeholders.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        values.push(
          estimateId, i + 1, item.category, item.description,
          item.hsnCode || null, item.width || null, item.wSupport || null,
          item.height || null, item.hSupport || null, item.size || null,
          item.quantity || 1, item.totalFit || 0, item.unit || "",
          item.rate || 0, item.amount || 0,
          item.gstPercent || 0, item.gstAmount || 0
        );
      }
      await client.query(
        `INSERT INTO estimate_items (estimate_id, sr_no, category, description, hsn_code, width, w_support, height, h_support, size, quantity, total_fit, unit, rate, amount, gst_percent, gst_amount) VALUES ${placeholders.join(",")}`,
        values
      );
    }

    await client.query("COMMIT");
    // === END TRANSACTION ===

    // Fetch and return updated estimate
    const [updated] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
    await logActivity(authP.id, "edit", "invoice", estimateId, `Updated: ${updated?.invoiceNumber}`);
    return NextResponse.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating estimate:", error);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  } finally {
    client.release();
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
    const estimateId = parseInt(id);

    await db
      .update(estimates)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
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