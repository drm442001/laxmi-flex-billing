import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { estimates, companySettings } from "@/db/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { getFinancialYear, numberToWords } from "@/lib/constants";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const invoiceType = searchParams.get("invoiceType");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const customerId = searchParams.get("customerId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(estimates.isDeleted, false)];

    if (type) conditions.push(eq(estimates.type, type));
    if (invoiceType) conditions.push(eq(estimates.invoiceType, invoiceType));
    if (status) conditions.push(eq(estimates.status, status));
    if (paymentStatus) conditions.push(eq(estimates.paymentStatus, paymentStatus));
    if (customerId) conditions.push(eq(estimates.customerId, parseInt(customerId)));
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

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "invoice.create");
  if (authP instanceof Response) return authP;
  // Input validation
  const body = await req.json();
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (typeof body.grandTotal !== "number" || body.grandTotal < 0) {
    return NextResponse.json({ error: "Invalid grand total" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      invoiceNumber, type, invoiceType, customerId, customerName, customerPhone,
      customerAddress, customerGst, customerState, invoiceDate, dueDate, items,
      subtotal, discountPercent, discountAmount, taxableAmount,
      cgstPercent, cgstAmount, sgstPercent, sgstAmount, igstPercent, igstAmount,
      gstPercent, gstAmount, roundOff, grandTotal, notes, termsConditions, status,
    } = body;

    // Get company settings for invoice number generation
    const [settings] = await db.select().from(companySettings).limit(1);
    const financialYear = getFinancialYear(new Date(invoiceDate || Date.now()));

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const prefix = type === "invoice"
        ? (settings?.invoicePrefix || "INV")
        : type === "quotation"
        ? (settings?.quotationPrefix || "QUO")
        : (settings?.calculationPrefix || "CAL");

      const counter = (settings?.invoiceCounter || 0) + 1;
      finalInvoiceNumber = `${prefix}/${financialYear}/${counter.toString().padStart(4, "0")}`;

      // Update counter inside transaction
      if (settings) {
        await client.query("UPDATE company_settings SET invoice_counter = $1 WHERE id = $2", [counter, settings.id]);
      }
    }

    const amountInWords = numberToWords(grandTotal);
    const invDate = invoiceDate || new Date().toISOString().split("T")[0];

    // Insert estimate
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
        notes, terms_conditions, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
      RETURNING *`,
      [
        finalInvoiceNumber, type || "invoice", invoiceType || "normal", financialYear,
        customerId || null, customerName || "", customerPhone || "", customerAddress || "",
        customerGst || null, customerState || null, invDate, dueDate || null,
        subtotal, discountPercent || 0, discountAmount || 0, taxableAmount || subtotal - (discountAmount || 0),
        cgstPercent || 0, cgstAmount || 0, sgstPercent || 0, sgstAmount || 0,
        igstPercent || 0, igstAmount || 0, gstPercent || 0, gstAmount || 0,
        roundOff || 0, grandTotal, amountInWords,
        0, grandTotal, "unpaid",
        notes || "", termsConditions || "", status || "saved",
      ]
    );
    const estimate = estResult.rows[0];

    // Insert items
    if (items.length > 0) {
      const vals: unknown[] = [];
      const phs: string[] = [];
      let idx = 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        phs.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        vals.push(
          estimate.id, i + 1, item.category, item.description,
          item.hsnCode || null, item.width || null, item.wSupport || null,
          item.height || null, item.hSupport || null, item.size || null,
          item.quantity || 1, item.totalFit || 0, item.unit || "",
          item.rate || 0, item.amount || 0, item.gstPercent || 0, item.gstAmount || 0
        );
      }
      await client.query(
        `INSERT INTO estimate_items (estimate_id,sr_no,category,description,hsn_code,width,w_support,height,h_support,size,quantity,total_fit,unit,rate,amount,gst_percent,gst_amount) VALUES ${phs.join(",")}`,
        vals
      );
    }

    // Update customer totals + ledger if invoice
    if (customerId && type === "invoice") {
      await client.query(
        `UPDATE customers SET total_business = total_business + $1, balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [grandTotal, customerId]
      );
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account_type, account_id, account_name, reference_type, reference_id, reference_number, particulars, debit, credit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [invDate, "customer", customerId, customerName || "Customer", "invoice", estimate.id, finalInvoiceNumber, `Invoice: ${finalInvoiceNumber}`, grandTotal, 0]
      );
    }

    await client.query("COMMIT");

    await logActivity(authP.id, "create", type || "invoice", estimate.id, `Created ${type || "invoice"}: ${estimate.invoice_number}`);

    // Return clean object
    return NextResponse.json({
      id: estimate.id,
      invoiceNumber: estimate.invoice_number,
      type: estimate.type,
      invoiceType: estimate.invoice_type,
      grandTotal: estimate.grand_total,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating estimate:", error);
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  } finally {
    client.release();
  }
}