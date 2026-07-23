import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

const MAX_SEARCH = 100;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");

    let query;
    if (search && search.length <= MAX_SEARCH) {
      const escaped = search.replace(/[%_\\]/g, (ch) => "\\" + ch);
      const p = `%${escaped}%`;
      query = db
        .select()
        .from(vendors)
        .where(or(
          eq(vendors.isActive, true),
          ilike(vendors.name, p),
          ilike(vendors.phone, p),
        ));
    } else {
      query = db.select().from(vendors).where(eq(vendors.isActive, true));
    }

    const result = await query.orderBy(vendors.name);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "purchase.create");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, contactPerson, phone, email, address, gstNumber, panNumber, notes } = body;
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Vendor name too long" }, { status: 400 });
    }
    const normEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    if (normEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const normPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
    if (normPhone && normPhone.length > 20) {
      return NextResponse.json({ error: "Phone too long" }, { status: 400 });
    }

    const [vendor] = await db
      .insert(vendors)
      .values({
        name: name.trim(),
        contactPerson: typeof contactPerson === "string" && contactPerson.trim() ? contactPerson.trim() : null,
        phone: normPhone,
        email: normEmail,
        address: typeof address === "string" && address.trim() ? address.trim() : null,
        gstNumber: typeof gstNumber === "string" && gstNumber.trim() ? gstNumber.trim() : null,
        panNumber: typeof panNumber === "string" && panNumber.trim() ? panNumber.trim() : null,
        notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
      })
      .returning();

    await logActivity(authP.id, "create", "vendor", vendor.id, `Vendor: ${name}`);
    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
