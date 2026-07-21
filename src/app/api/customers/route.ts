import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { desc, ilike, or, eq, and, sql, gt } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const withBalance = searchParams.get("withBalance");
    const overCreditLimit = searchParams.get("overCreditLimit");

    let conditions = [eq(customers.isDeleted, false)];
    
    if (search) {
      // Add search condition
    }
    if (withBalance === "true") {
      conditions.push(gt(customers.balance, 0));
    }
    if (overCreditLimit === "true") {
      conditions.push(sql`${customers.balance} > ${customers.creditLimit}`);
      conditions.push(gt(customers.creditLimit, 0));
    }

    let query = db.select().from(customers).where(and(...conditions));
    
    if (search) {
      query = db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.isDeleted, false),
            or(
              ilike(customers.name, `%${search}%`),
              ilike(customers.phone, `%${search}%`),
              ilike(customers.email, `%${search}%`),
              ilike(customers.gstNumber, `%${search}%`)
            )
          )
        ) as typeof query;
    }

    const result = await query.orderBy(desc(customers.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "customer.create");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json();
    // Input validation
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    const {
      name,
      phone,
      whatsapp,
      email,
      address,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
      creditLimit,
      creditDays,
      openingBalance,
      autoReminder,
      notes,
    } = body;

    // Check for duplicate
    if (phone) {
      const existing = await db
        .select()
        .from(customers)
        .where(and(eq(customers.phone, phone), eq(customers.isDeleted, false)))
        .limit(1);
      
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Customer with this phone number already exists", duplicate: existing[0] },
          { status: 400 }
        );
      }
    }

    // Generate customer code
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const customerCode = `CUST${(countResult[0].count + 1).toString().padStart(4, "0")}`;

    const [customer] = await db
      .insert(customers)
      .values({
        customerCode,
        name,
        phone: phone || null,
        whatsapp: whatsapp || phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || "Maharashtra",
        pincode: pincode || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        creditLimit: creditLimit || 0,
        creditDays: creditDays || 30,
        openingBalance: openingBalance || 0,
        balance: openingBalance || 0,
        autoReminder: autoReminder !== false,
        notes: notes || null,
      })
      .returning();

    await logActivity(authP.id, "create", "customer", customer.id, `Customer: ${name}`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}