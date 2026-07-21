import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, estimateItems, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateInvoiceNumber } from "@/lib/constants";
import { requirePermission, logActivity } from "@/lib/auth";

// Convert quotation/calculation to invoice
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(_req, "invoice.create");
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const estimateId = parseInt(id);

    // Get original estimate
    const [original] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, estimateId));

    if (!original) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get items
    const items = await db
      .select()
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, estimateId));

    // Generate new invoice number
    const newInvoiceNumber = generateInvoiceNumber("invoice");

    // Create new invoice — copy ALL fields including GST breakdown
    const [newInvoice] = await db
      .insert(estimates)
      .values({
        invoiceNumber: newInvoiceNumber,
        type: "invoice",
        invoiceType: original.invoiceType,
        financialYear: original.financialYear,
        customerId: original.customerId,
        customerName: original.customerName,
        customerPhone: original.customerPhone,
        customerAddress: original.customerAddress,
        customerGst: original.customerGst,
        customerState: original.customerState,
        invoiceDate: new Date().toISOString().split("T")[0],
        subtotal: original.subtotal,
        discountPercent: original.discountPercent,
        discountAmount: original.discountAmount,
        taxableAmount: original.taxableAmount,
        cgstPercent: original.cgstPercent,
        cgstAmount: original.cgstAmount,
        sgstPercent: original.sgstPercent,
        sgstAmount: original.sgstAmount,
        igstPercent: original.igstPercent,
        igstAmount: original.igstAmount,
        gstPercent: original.gstPercent,
        gstAmount: original.gstAmount,
        roundOff: original.roundOff,
        grandTotal: original.grandTotal,
        amountInWords: original.amountInWords,
        paidAmount: 0,
        balanceAmount: original.grandTotal,
        paymentStatus: "unpaid",
        notes: original.notes,
        termsConditions: original.termsConditions,
        status: "saved",
      })
      .returning();

    // Copy items — including HSN and GST fields
    if (items.length > 0) {
      await db.insert(estimateItems).values(
        items.map((item) => ({
          estimateId: newInvoice.id,
          srNo: item.srNo,
          category: item.category,
          description: item.description,
          hsnCode: item.hsnCode,
          width: item.width,
          wSupport: item.wSupport,
          height: item.height,
          hSupport: item.hSupport,
          size: item.size,
          quantity: item.quantity,
          totalFit: item.totalFit,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          gstPercent: item.gstPercent,
          gstAmount: item.gstAmount,
        }))
      );
    }

    // Update customer totals
    if (original.customerId) {
      await db
        .update(customers)
        .set({
          totalBusiness: sql`${customers.totalBusiness} + ${original.grandTotal}`,
          balance: sql`${customers.balance} + ${original.grandTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, original.customerId));
    }

    // Mark original as converted (optional: keep or delete)
    await db
      .update(estimates)
      .set({
        status: "converted",
        notes: `${original.notes || ""}\n[Converted to Invoice: ${newInvoiceNumber}]`.trim(),
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, estimateId));

    await logActivity(auth.id, "convert", "invoice", newInvoice.id, `Converted #${estimateId} → ${newInvoiceNumber}`);
    return NextResponse.json(newInvoice);
  } catch (error) {
    console.error("Error converting to invoice:", error);
    return NextResponse.json({ error: "Failed to convert" }, { status: 500 });
  }
}