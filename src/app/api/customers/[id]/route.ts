import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, estimates, payments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const customerId = parseId(id);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customerEstimates = await db
      .select()
      .from(estimates)
      .where(and(eq(estimates.customerId, customerId), eq(estimates.isDeleted, false)))
      .orderBy(desc(estimates.createdAt));

    const customerPayments = await db
      .select()
      .from(payments)
      .where(and(eq(payments.customerId, customerId), eq(payments.isDeleted, false)))
      .orderBy(desc(payments.createdAt));

    return NextResponse.json({
      ...customer,
      estimates: customerEstimates,
      payments: customerPayments,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authP = await requirePermission(req, "customer.edit");
  if (authP instanceof Response) return authP;
  try {
    const { id } = await params;
    const customerId = parseId(id);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Customer name too long" }, { status: 400 });
    }

    const normPhone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const normEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    if (normEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const creditLimitNum = typeof body.creditLimit === "number" && isFinite(body.creditLimit) ? Math.max(0, body.creditLimit) : 0;
    const creditDaysNum = typeof body.creditDays === "number" && isFinite(body.creditDays) ? Math.max(0, Math.min(3650, body.creditDays)) : 30;

    const [existing] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [customer] = await db
      .update(customers)
      .set({
        name,
        phone: normPhone,
        whatsapp: typeof body.whatsapp === "string" && body.whatsapp.trim() ? body.whatsapp.trim() : null,
        email: normEmail,
        address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
        city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
        state: typeof body.state === "string" && body.state.trim() ? body.state.trim() : "Maharashtra",
        pincode: typeof body.pincode === "string" && body.pincode.trim() ? body.pincode.trim() : null,
        gstNumber: typeof body.gstNumber === "string" && body.gstNumber.trim() ? body.gstNumber.trim() : null,
        panNumber: typeof body.panNumber === "string" && body.panNumber.trim() ? body.panNumber.trim() : null,
        creditLimit: creditLimitNum,
        creditDays: creditDaysNum,
        autoReminder: body.autoReminder !== false,
        notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : null,
        updatedAt: new Date(),
        updatedBy: authP.id,
      })
      .where(eq(customers.id, customerId))
      .returning();

    await logActivity(authP.id, "edit", "customer", customerId, `Updated: ${name}`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authD = await requirePermission(_req, "customer.delete");
  if (authD instanceof Response) return authD;
  try {
    const { id } = await params;
    const customerId = parseId(id);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    // Guard: block deletion if customer has outstanding balance or non-deleted invoices.
    const [withBal] = await db
      .select({ balance: customers.balance })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (withBal && Number(withBal.balance) > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with outstanding balance. Please settle dues first." },
        { status: 400 }
      );
    }

    await db
      .update(customers)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
        deletedBy: authD.id,
      })
      .where(eq(customers.id, customerId));

    await logActivity(authD.id, "delete", "customer", customerId, `Deleted customer #${customerId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
