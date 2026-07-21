import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, estimates, payments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(_req);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const customerId = parseInt(id);

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
    const customerId = parseInt(id);
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const [customer] = await db
      .update(customers)
      .set({
        name: body.name,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || "Maharashtra",
        pincode: body.pincode || null,
        gstNumber: body.gstNumber || null,
        panNumber: body.panNumber || null,
        creditLimit: body.creditLimit ?? 0,
        creditDays: body.creditDays ?? 30,
        autoReminder: body.autoReminder !== false,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    await logActivity(authP.id, "edit", "customer", customerId, `Updated: ${body.name}`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// Soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authD = await requirePermission(_req, "customer.delete");
  if (authD instanceof Response) return authD;
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    await db
      .update(customers)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    await logActivity(authD.id, "delete", "customer", customerId, `Deleted customer #${customerId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}