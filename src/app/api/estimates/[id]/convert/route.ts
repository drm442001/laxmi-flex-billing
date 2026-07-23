import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { estimates, estimateItems, customers, companySettings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getFinancialYear } from "@/lib/constants";
import { requirePermission, logActivity, parseId } from "@/lib/auth";

// Convert quotation/calculation to invoice (creates a NEW invoice; marks original converted).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(_req, "invoice.create");
  if (auth instanceof Response) return auth;

  const client = await pool.connect();
  try {
    const { id } = await params;
    const estimateId = parseId(id);
    if (!Number.isFinite(estimateId) || estimateId <= 0) {
      client.release();
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await client.query("BEGIN");
    // Lock source row
    const origRes = await client.query("SELECT * FROM estimates WHERE id = $1 FOR UPDATE", [estimateId]);
    const original = origRes.rows[0];

    if (!original || original.is_deleted) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (original.type === "invoice") {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "Only quotations/calculations can be converted" }, { status: 400 });
    }
    if (original.status === "converted") {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ error: "This document has already been converted" }, { status: 400 });
    }

    // Get items
    const itemsRes = await client.query("SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY sr_no", [estimateId]);
    const items = itemsRes.rows;

    // Race-safe invoice number (lock settings row)
    const setRes = await client.query(
      "SELECT id, invoice_prefix, invoice_counter FROM company_settings LIMIT 1 FOR UPDATE"
    );
    const settings = setRes.rows[0];
    const now = new Date();
    const financialYear = getFinancialYear(now);
    const counter = (settings?.invoice_counter || 0) + 1;
    const newInvoiceNumber = `${settings?.invoice_prefix || "INV"}/${financialYear}/${counter.toString().padStart(4, "0")}`;
    if (settings) {
      await client.query("UPDATE company_settings SET invoice_counter = $1, updated_at = NOW() WHERE id = $2", [counter, settings.id]);
    }

    const today = now.toISOString().split("T")[0];

    const invRes = await client.query(
      `INSERT INTO estimates (
        invoice_number, type, invoice_type, financial_year,
        customer_id, customer_name, customer_phone, customer_address,
        customer_gst, customer_state, invoice_date, due_date,
        subtotal, discount_percent, discount_amount, taxable_amount,
        cgst_percent, cgst_amount, sgst_percent, sgst_amount,
        igst_percent, igst_amount, gst_percent, gst_amount,
        round_off, grand_total, amount_in_words,
        paid_amount, balance_amount, payment_status,
        notes, terms_conditions, status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34) RETURNING *`,
      [
        newInvoiceNumber, "invoice", original.invoice_type || "normal", financialYear,
        original.customer_id, original.customer_name, original.customer_phone, original.customer_address,
        original.customer_gst, original.customer_state, today, null,
        Number(original.subtotal) || 0, Number(original.discount_percent) || 0, Number(original.discount_amount) || 0,
        Number(original.taxable_amount) || 0,
        Number(original.cgst_percent) || 0, Number(original.cgst_amount) || 0,
        Number(original.sgst_percent) || 0, Number(original.sgst_amount) || 0,
        Number(original.igst_percent) || 0, Number(original.igst_amount) || 0,
        Number(original.gst_percent) || 0, Number(original.gst_amount) || 0,
        Number(original.round_off) || 0, Number(original.grand_total) || 0, original.amount_in_words,
        0, Number(original.grand_total) || 0, "unpaid",
        original.notes, original.terms_conditions, "saved", auth.id,
      ]
    );
    const newInvoice = invRes.rows[0];

    // Copy items
    if (items.length > 0) {
      const vals: unknown[] = [];
      const phs: string[] = [];
      let idx = 1;
      for (const item of items) {
        phs.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        vals.push(
          newInvoice.id, item.sr_no, item.category, item.description,
          item.hsn_code, item.width, item.w_support, item.height, item.h_support,
          item.size, item.quantity, item.total_fit, item.unit, item.rate,
          item.amount, item.gst_percent, item.gst_amount
        );
      }
      await client.query(
        `INSERT INTO estimate_items (estimate_id,sr_no,category,description,hsn_code,width,w_support,height,h_support,size,quantity,total_fit,unit,rate,amount,gst_percent,gst_amount) VALUES ${phs.join(",")}`,
        vals
      );
    }

    // Update customer totals + ledger
    if (original.customer_id) {
      await client.query(
        "UPDATE customers SET total_business = total_business + $1, balance = balance + $1, updated_at = NOW() WHERE id = $2",
        [Number(original.grand_total) || 0, original.customer_id]
      );
      await client.query(
        `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [today, "customer", original.customer_id, original.customer_name || "Customer",
         "invoice", newInvoice.id, newInvoiceNumber, `Invoice (converted): ${newInvoiceNumber}`,
         Number(original.grand_total) || 0, 0, auth.id]
      );
    }

    // Mark original as converted
    const appendedNote = `${original.notes || ""}\n[Converted to Invoice: ${newInvoiceNumber}]`.trim();
    await client.query(
      "UPDATE estimates SET status = 'converted', converted_to = $1, notes = $2, updated_at = NOW() WHERE id = $3",
      [newInvoice.id, appendedNote.slice(0, 1000), estimateId]
    );

    await client.query("COMMIT");
    client.release();

    await logActivity(auth.id, "convert", "invoice", newInvoice.id, `Converted #${estimateId} → ${newInvoiceNumber}`);
    return NextResponse.json(newInvoice);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Error converting to invoice:", error);
    return NextResponse.json({ error: "Failed to convert" }, { status: 500 });
  }
}
