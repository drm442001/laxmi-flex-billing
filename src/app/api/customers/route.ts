import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { customers } from "@/db/schema";
import { desc, ilike, or, eq, and, sql, gt } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

const MAX_SEARCH_LEN = 100;

interface CustomerLike {
  id: number | null;
  name: string;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  source: "customer" | "invoice";
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const withBalance = searchParams.get("withBalance");
    const overCreditLimit = searchParams.get("overCreditLimit");

    // Quick-search (used by autocomplete): merge results from the customers
    // table AND from distinct customer_name/customer_phone/customer_address
    // values found on past estimates (invoices/quotations). This ensures a
    // customer from any old invoice shows up in suggestions even if they
    // weren't explicitly added to the customers master.
    if (search && search.length <= MAX_SEARCH_LEN && !withBalance && !overCreditLimit) {
      const q = search.trim().slice(0, MAX_SEARCH_LEN);
      const like = `%${q.replace(/[%_\\]/g, (ch) => "\\" + ch)}%`;
      const client = await pool.connect();
      try {
        const r = await client.query(
          `WITH from_customers AS (
              SELECT id, name, phone, address, gst_number AS "gstNumber",
                     'customer' AS source,
                     -- Rank: exact name match first, then prefix, then contains
                     CASE WHEN lower(name) = lower($1) THEN 0
                          WHEN lower(name) LIKE lower($2) THEN 1
                          ELSE 2 END AS rank
              FROM customers
              WHERE is_deleted = false
                AND (name ILIKE $3 OR phone ILIKE $3 OR gst_number ILIKE $3)
            ),
            from_invoices AS (
              SELECT NULL::int AS id,
                     customer_name AS name,
                     customer_phone AS phone,
                     customer_address AS address,
                     customer_gst AS "gstNumber",
                     'invoice' AS source,
                     3 AS rank
              FROM estimates
              WHERE is_deleted = false
                AND customer_name IS NOT NULL AND customer_name <> ''
                AND customer_name ILIKE $3
              GROUP BY customer_name, customer_phone, customer_address, customer_gst
            )
            SELECT * FROM (
              SELECT * FROM from_customers
              UNION ALL
              SELECT fi.* FROM from_invoices fi
              WHERE NOT EXISTS (
                SELECT 1 FROM from_customers fc
                WHERE lower(fc.name) = lower(fi.name)
              )
            ) merged
            ORDER BY rank ASC, name ASC
            LIMIT 10`,
          [q, `${q}%`, like]
        );
        return NextResponse.json(r.rows as CustomerLike[]);
      } finally {
        client.release();
      }
    }

    const conditions: ReturnType<typeof eq>[] = [eq(customers.isDeleted, false)];

    if (search && search.length <= MAX_SEARCH_LEN) {
      const escaped = search.replace(/[%_\\]/g, (ch) => "\\" + ch);
      const p = `%${escaped}%`;
      const searchCond = or(
        ilike(customers.name, p),
        ilike(customers.phone, p),
        ilike(customers.email, p),
        ilike(customers.gstNumber, p),
      ) as ReturnType<typeof eq>;
      conditions.push(searchCond);
    }
    if (withBalance === "true") {
      conditions.push(gt(customers.balance, 0));
    }
    if (overCreditLimit === "true") {
      conditions.push(sql`${customers.balance} > ${customers.creditLimit}`);
      conditions.push(gt(customers.creditLimit, 0));
    }

    const result = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt));

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
    const {
      phone, whatsapp, email, address, city, state, pincode,
      gstNumber, panNumber, creditLimit, creditDays, openingBalance,
      autoReminder, notes,
    } = body;

    const normPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
    if (normPhone && normPhone.length > 20) {
      return NextResponse.json({ error: "Phone number too long" }, { status: 400 });
    }
    const normEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    if (normEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const creditLimitNum = typeof creditLimit === "number" && isFinite(creditLimit) ? Math.max(0, creditLimit) : 0;
    const creditDaysNum = typeof creditDays === "number" && isFinite(creditDays) ? Math.max(0, Math.min(3650, creditDays)) : 30;
    const openingBalanceNum = typeof openingBalance === "number" && isFinite(openingBalance) ? openingBalance : 0;
    if (typeof gstNumber === "string" && gstNumber.length > 20) {
      return NextResponse.json({ error: "GST number too long" }, { status: 400 });
    }

    if (normPhone) {
      const existing = await db
        .select()
        .from(customers)
        .where(and(eq(customers.phone, normPhone), eq(customers.isDeleted, false)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Customer with this phone number already exists", duplicate: existing[0] },
          { status: 400 }
        );
      }
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const customerCode = `CUST${(Number(countResult[0].count) + 1).toString().padStart(4, "0")}`;

    const [customer] = await db
      .insert(customers)
      .values({
        customerCode,
        name,
        phone: normPhone,
        whatsapp: (typeof whatsapp === "string" && whatsapp.trim() ? whatsapp.trim() : null) || normPhone,
        email: normEmail,
        address: typeof address === "string" && address.trim() ? address.trim() : null,
        city: typeof city === "string" && city.trim() ? city.trim() : null,
        state: typeof state === "string" && state.trim() ? state.trim() : "Maharashtra",
        pincode: typeof pincode === "string" && pincode.trim() ? pincode.trim() : null,
        gstNumber: typeof gstNumber === "string" && gstNumber.trim() ? gstNumber.trim() : null,
        panNumber: typeof panNumber === "string" && panNumber.trim() ? panNumber.trim() : null,
        creditLimit: creditLimitNum,
        creditDays: creditDaysNum,
        openingBalance: openingBalanceNum,
        balance: openingBalanceNum,
        autoReminder: autoReminder !== false,
        notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
        createdBy: authP.id,
      })
      .returning();

    await logActivity(authP.id, "create", "customer", customer.id, `Customer: ${name}`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
