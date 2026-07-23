import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { estimates, estimateItems, companySettings } from "@/db/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { getFinancialYear, numberToWords } from "@/lib/constants";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

const VALID_TYPES = new Set(["invoice", "quotation", "calculation"]);
const VALID_INVOICE_TYPES = new Set(["normal", "tax"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const invoiceType = searchParams.get("invoiceType");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const customerIdRaw = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions: ReturnType<typeof eq>[] = [eq(estimates.isDeleted, false)];

    if (type) {
      if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      conditions.push(eq(estimates.type, type));
    }
    if (invoiceType) conditions.push(eq(estimates.invoiceType, invoiceType));
    if (status) conditions.push(eq(estimates.status, status));
    if (paymentStatus) conditions.push(eq(estimates.paymentStatus, paymentStatus));
    if (customerIdRaw) {
      const cid = parseId(customerIdRaw);
      if (!Number.isFinite(cid) || cid <= 0) return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
      conditions.push(eq(estimates.customerId, cid));
    }
    if (from) conditions.push(gte(estimates.invoiceDate, from));
    if (to) conditions.push(lte(estimates.invoiceDate, to));

    const allEstimates = await db
      .select()
      .from(estimates)
      .where(and(...conditions))
      .orderBy(desc(estimates.createdAt));

    return NextResponse.json(allEstimates);
  } catch (error) {
    console.error("Error fetching estimates:", error);
    return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
  }
}

function sanitizeItems(items: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(items) || items.length === 0) return null;
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
      category: String(item.category).slice(0, 32),
      description: String(item.description).slice(0, 200),
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

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && isFinite(v) ? Number(v.toFixed(2)) : fallback;
}
function numMax(v: unknown, fallback: number): number {
  const n = num(v, fallback);
  return n < 0 ? 0 : n;
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "invoice.create");
  if (authP instanceof Response) return authP;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const type = typeof body.type === "string" && VALID_TYPES.has(body.type) ? body.type : "invoice";
  const invoiceType = typeof body.invoiceType === "string" && VALID_INVOICE_TYPES.has(body.invoiceType) ? body.invoiceType : "normal";

  const safeItems = sanitizeItems(body.items);
  if (!safeItems) {
    return NextResponse.json({ error: "At least one valid item is required" }, { status: 400 });
  }

  // Server-side validation of monetary values (clamp, don't override).
  // We do NOT recompute totals from scratch — that would fight the client's
  // GST rules (CGST/SGST vs IGST) and produce 400s. Instead we sanity-check
  // that grandTotal is non-negative and use the client-supplied numbers.
  const subtotal = numMax(body.subtotal, 0);
  const discountPercent = typeof body.discountPercent === "number" && isFinite(body.discountPercent)
    ? Math.max(0, Math.min(100, body.discountPercent)) : 0;
  const discountAmount = numMax(body.discountAmount, 0);
  const taxableAmount = numMax(body.taxableAmount, Math.max(0, subtotal - discountAmount));
  const cgstPercent = num(body.cgstPercent, 0);
  const cgstAmount = numMax(body.cgstAmount, 0);
  const sgstPercent = num(body.sgstPercent, 0);
  const sgstAmount = numMax(body.sgstAmount, 0);
  const igstPercent = num(body.igstPercent, 0);
  const igstAmount = numMax(body.igstAmount, 0);
  const gstPercent = num(body.gstPercent, 0);
  const gstAmount = numMax(body.gstAmount, cgstAmount + sgstAmount + igstAmount);
  const roundOff = typeof body.roundOff === "number" && isFinite(body.roundOff) ? Number(body.roundOff.toFixed(2)) : 0;
  const grandTotal = numMax(body.grandTotal, taxableAmount + gstAmount + roundOff);
  if (grandTotal <= 0 && safeItems.length > 0) {
    return NextResponse.json({ error: "Grand total must be greater than 0" }, { status: 400 });
  }

  // Advance/payment-at-invoice-time (cash + account split)
  const advanceCash = typeof body.advanceCash === "number" && isFinite(body.advanceCash)
    ? Math.max(0, Number(body.advanceCash.toFixed(2))) : 0;
  const advanceAccount = typeof body.advanceAccount === "number" && isFinite(body.advanceAccount)
    ? Math.max(0, Number(body.advanceAccount.toFixed(2))) : 0;
  const advanceTotal = Number((advanceCash + advanceAccount).toFixed(2));
  if (advanceTotal > grandTotal + 0.01) {
    return NextResponse.json({ error: "Advance payment exceeds grand total" }, { status: 400 });
  }

  const customerId = parseId(body.customerId);
  if (body.customerId != null && !Number.isFinite(customerId)) {
    return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
  }

  const invDate = typeof body.invoiceDate === "string" && body.invoiceDate
    ? body.invoiceDate
    : new Date().toISOString().split("T")[0];
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;
  const customerName = typeof body.customerName === "string" ? body.customerName.slice(0, 120) : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.slice(0, 20) : "";
  const customerAddress = typeof body.customerAddress === "string" ? body.customerAddress.slice(0, 300) : "";
  const customerGst = typeof body.customerGst === "string" ? body.customerGst.slice(0, 20) : null;
  const customerState = typeof body.customerState === "string" ? body.customerState.slice(0, 50) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 1000) : "";
  const termsConditions = typeof body.termsConditions === "string" ? body.termsConditions.slice(0, 2000) : "";
  const status = typeof body.status === "string" ? body.status.slice(0, 20) : "saved";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Auto-create/lookup customer by phone (or name+phone) so future invoices
    // can autocomplete this customer. Skips if customerId was passed explicitly.
    let resolvedCustomerId: number | null = customerId || null;
    if (!resolvedCustomerId && customerName.trim()) {
      if (customerPhone.trim()) {
        const byPhone = await client.query(
          "SELECT id FROM customers WHERE phone = $1 AND is_deleted = false LIMIT 1",
          [customerPhone.trim()]
        );
        if (byPhone.rowCount && byPhone.rowCount > 0) {
          resolvedCustomerId = byPhone.rows[0].id;
          // Refresh address/gst if they were blank before
          await client.query(
            `UPDATE customers
             SET address = COALESCE(NULLIF(address,''), $2),
                 gst_number = COALESCE(NULLIF(gst_number,''), $3),
                 updated_at = NOW()
             WHERE id = $1 AND (NULLIF(address,'') IS NULL OR NULLIF(gst_number,'') IS NULL)`,
            [resolvedCustomerId, customerAddress.trim() || null, customerGst || null]
          );
        }
      }
      if (!resolvedCustomerId) {
        // Avoid duplicate name+phone
        const byName = await client.query(
          "SELECT id FROM customers WHERE lower(name) = lower($1) AND is_deleted = false LIMIT 1",
          [customerName.trim()]
        );
        if (byName.rowCount && byName.rowCount > 0) {
          resolvedCustomerId = byName.rows[0].id;
        } else {
          const countRes = await client.query("SELECT count(*)::int AS c FROM customers");
          const custCode = `CUST${(Number(countRes.rows[0].c) + 1).toString().padStart(4, "0")}`;
          const ins = await client.query(
            `INSERT INTO customers (customer_code, name, phone, address, gst_number, state, balance, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,0,$7) RETURNING id`,
            [custCode, customerName.trim(), customerPhone.trim() || null,
             customerAddress.trim() || null, customerGst, customerState || "Maharashtra", authP.id]
          );
          resolvedCustomerId = ins.rows[0].id;
        }
      }
    }

    const settingsRes = await client.query(
      "SELECT id, invoice_prefix, quotation_prefix, calculation_prefix, invoice_counter FROM company_settings LIMIT 1 FOR UPDATE"
    );
    const settings = settingsRes.rows[0];
    const financialYear = getFinancialYear(new Date(invDate));

    let finalInvoiceNumber: string;
    if (typeof body.invoiceNumber === "string" && body.invoiceNumber.trim()) {
      finalInvoiceNumber = body.invoiceNumber.trim();
      const dup = await client.query("SELECT 1 FROM estimates WHERE invoice_number = $1 LIMIT 1", [finalInvoiceNumber]);
      if (dup.rowCount && dup.rowCount > 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
      }
    } else {
      const prefix = type === "invoice"
        ? (settings?.invoice_prefix || "INV")
        : type === "quotation"
        ? (settings?.quotation_prefix || "QUO")
        : (settings?.calculation_prefix || "CAL");
      const counter = (settings?.invoice_counter || 0) + 1;
      finalInvoiceNumber = `${prefix}/${financialYear}/${counter.toString().padStart(4, "0")}`;
      if (settings) {
        await client.query("UPDATE company_settings SET invoice_counter = $1, updated_at = NOW() WHERE id = $2", [counter, settings.id]);
      }
    }

    const amountInWords = numberToWords(grandTotal);

    const estResult = await client.query(
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
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
      RETURNING *`,
      [
        finalInvoiceNumber, type, invoiceType, financialYear,
        resolvedCustomerId, customerName, customerPhone, customerAddress,
        customerGst, customerState, invDate, dueDate,
        subtotal, discountPercent, discountAmount, taxableAmount,
        cgstPercent, cgstAmount, sgstPercent, sgstAmount,
        igstPercent, igstAmount, gstPercent, gstAmount,
        roundOff, grandTotal, amountInWords,
        advanceTotal, Math.max(0, Number((grandTotal - advanceTotal).toFixed(2))),
        advanceTotal >= grandTotal - 0.005 ? "paid" : advanceTotal > 0 ? "partial" : "unpaid",
        notes, termsConditions, status, authP.id,
      ]
    );
    const estimate = estResult.rows[0];

    if (safeItems.length > 0) {
      const vals: unknown[] = [];
      const phs: string[] = [];
      let idx = 1;
      for (let i = 0; i < safeItems.length; i++) {
        const item = safeItems[i];
        phs.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        vals.push(
          estimate.id, i + 1, item.category, item.description,
          item.hsnCode, item.width, item.wSupport,
          item.height, item.hSupport, item.size,
          item.quantity, item.totalFit, item.unit,
          item.rate, item.amount, item.gstPercent, item.gstAmount
        );
      }
      await client.query(
        `INSERT INTO estimate_items (estimate_id,sr_no,category,description,hsn_code,width,w_support,height,h_support,size,quantity,total_fit,unit,rate,amount,gst_percent,gst_amount) VALUES ${phs.join(",")}`,
        vals
      );
    }

    // Record advance payments at invoice creation (cash and/or account).
    const advancePayments: { amount: number; method: string; label: string }[] = [];
    if (advanceCash > 0) advancePayments.push({ amount: advanceCash, method: "cash", label: "Cash" });
    if (advanceAccount > 0) advancePayments.push({ amount: advanceAccount, method: "bank", label: "Account/Bank" });

    let payCounter = 0;
    const countRow = await client.query("SELECT count(*)::int as count FROM payments");
    payCounter = Number(countRow.rows[0]?.count || 0);

    for (const pay of advancePayments) {
      payCounter += 1;
      const paymentNumber = `PAY-${payCounter.toString().padStart(5, "0")}`;
      const payRes = await client.query(
        `INSERT INTO payments (payment_number, estimate_id, customer_id, amount, payment_method, notes, payment_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [paymentNumber, estimate.id, resolvedCustomerId, pay.amount, pay.method,
         `Advance (${pay.label}) with invoice`, invDate, authP.id]
      );
      const payment = payRes.rows[0];

      if (resolvedCustomerId) {
        await client.query(
          "UPDATE customers SET total_paid = total_paid + $1, balance = GREATEST(0, balance - $1), updated_at = NOW() WHERE id = $2",
          [pay.amount, resolvedCustomerId]
        );
        await client.query(
          `INSERT INTO ledger_entries (entry_date,account_type,account_id,account_name,reference_type,reference_id,reference_number,particulars,debit,credit,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [invDate, "customer", resolvedCustomerId, customerName || "Customer", "payment", payment.id, paymentNumber,
           `Advance for ${finalInvoiceNumber} (${pay.label})`, 0, pay.amount, authP.id]
        );
      }

      await client.query(
        `INSERT INTO cash_book (entry_date,entry_type,reference_type,reference_id,reference_number,particulars,debit,credit,payment_method,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [invDate, "receipt", "payment", payment.id, paymentNumber,
         `Advance from ${customerName || "Customer"} - ${finalInvoiceNumber} (${pay.label})`,
         pay.amount, 0, pay.method, authP.id]
      );
    }

    if (resolvedCustomerId && type === "invoice") {
      // Customer balance = total_business - total_paid. total_paid already bumped
      // above for advances, so balance here should be (grandTotal - advanceTotal).
      await client.query(
        `UPDATE customers SET total_business = total_business + $1, balance = GREATEST(0, balance + ($1 - $2)), updated_at = NOW() WHERE id = $3`,
        [grandTotal, advanceTotal, resolvedCustomerId]
      );
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account_type, account_id, account_name, reference_type, reference_id, reference_number, particulars, debit, credit, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [invDate, "customer", resolvedCustomerId, customerName || "Customer", "invoice", estimate.id, finalInvoiceNumber, `Invoice: ${finalInvoiceNumber}`, grandTotal, 0, authP.id]
      );
    }

    await client.query("COMMIT");

    await logActivity(authP.id, "create", type, estimate.id, `Created ${type}: ${estimate.invoice_number}`);

    return NextResponse.json({
      id: estimate.id,
      invoiceNumber: estimate.invoice_number,
      type: estimate.type,
      invoiceType: estimate.invoice_type,
      grandTotal: estimate.grand_total,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error creating estimate:", error);
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  } finally {
    client.release();
  }
}
