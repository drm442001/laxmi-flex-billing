import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");

    let query = db.select().from(vendors).where(eq(vendors.isActive, true));
    
    if (search) {
      query = db
        .select()
        .from(vendors)
        .where(
          or(
            ilike(vendors.name, `%${search}%`),
            ilike(vendors.phone, `%${search}%`)
          )
        ) as typeof query;
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
    const body = await req.json();
    const { name, contactPerson, phone, email, address, gstNumber, panNumber, notes } = body;

    const [vendor] = await db
      .insert(vendors)
      .values({
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        notes: notes || null,
      })
      .returning();

    await logActivity(authP.id, "create", "vendor", vendor.id, `Vendor: ${name}`);
    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}