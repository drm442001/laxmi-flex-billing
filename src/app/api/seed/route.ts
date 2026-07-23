import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster, companySettings, users, sessions, expenseCategories } from "@/db/schema";
import { BOOTSTRAP_STATEMENTS } from "@/db/migrations";
import { PRINT_ITEMS, FRAME_ITEMS, OTHER_ITEMS, EXPENSE_CATEGORIES } from "@/lib/constants";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

// /api/seed — creates tables and bootstraps an admin user.
//
// SECURITY:
//  - Only runs table/bootstrap work when there are ZERO users (fresh install).
//  - In production admin auth is ALWAYS required.
//  - In development admin auth is required too, UNLESS there are no users yet
//    (to allow first-run setup without chicken-and-egg).
//  - Existing admin password is NEVER overwritten — even by an admin.

function sqlErrorText(e: any): string {
  return [e?.message, e?.cause?.message, e?.data?.error, e?.cause?.data?.error]
    .filter(Boolean)
    .map(String)
    .join(" ");
}

async function ensureTablesExist(): Promise<string[]> {
  const problems: string[] = [];
  for (const statement of BOOTSTRAP_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      const info = sqlErrorText(e);
      const code = e?.cause?.code ?? e?.code;
      if (code === "42P07" || code === "42701" || code === "42710" || /already exists/i.test(info)) continue;
      problems.push(info || String(e));
    }
  }
  return problems;
}

async function getAuthedAdmin(req: NextRequest): Promise<boolean> {
  try {
    const cookieToken = req.cookies.get("lfp_session")?.value;
    const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;
    if (!token) return false;
    const [session] = await db
      .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(sql`${sessions.token} = ${token} AND ${sessions.expiresAt} > NOW()`);
    if (!session) return false;
    const [u] = await db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(sql`${users.id} = ${session.userId} AND ${users.isActive} = true`);
    return !!u && u.role === "admin";
  } catch {
    return false;
  }
}

async function handle(req: NextRequest) {
  try {
    const problems = await ensureTablesExist();
    if (problems.length > 0) {
      return NextResponse.json(
        { error: "Tables तयार करताना अडचण: " + problems[0], hint: "DATABASE_URL बरोबर आहे का ते तपासा." },
        { status: 500 }
      );
    }

    const [{ userCount }] = await db.select({ userCount: sql<number>`count(*)::int` }).from(users);
    const isFreshInstall = Number(userCount) === 0;
    const isAdmin = await getAuthedAdmin(req);

    if (!isAdmin && !isFreshInstall) {
      return NextResponse.json(
        { error: "Permission denied — admin login required." },
        { status: 403 }
      );
    }

    const DEFAULT_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin123";
    let createdAdmin = false;
    if (isFreshInstall) {
      const hashed = await hashPassword(DEFAULT_PASSWORD);
      await db
        .insert(users)
        .values({
          username: "admin",
          password: hashed,
          name: "Administrator",
          role: "admin",
          isActive: true,
        })
        .onConflictDoNothing();
      createdAdmin = true;
    }

    // Seed rate master & company settings only if missing (idempotent)
    const existing = await db.select().from(rateMaster).limit(1);
    let seededDefaultData = false;
    if (existing.length === 0) {
      const rateRecords: any[] = [];
      PRINT_ITEMS.forEach((item, i) => rateRecords.push({ category: "print", itemName: item.name, itemCode: "PRT" + i, hsnCode: item.hsn, defaultRate: 0, unit: "Sq.Ft" }));
      FRAME_ITEMS.forEach((item, i) => rateRecords.push({ category: "frame", itemName: item.name, itemCode: "FRM" + i, hsnCode: item.hsn, defaultRate: 0, unit: "R.Ft" }));
      OTHER_ITEMS.forEach((item, i) => rateRecords.push({ category: "other", itemName: item.name, itemCode: "OTH" + i, hsnCode: item.hsn, defaultRate: 0, unit: "Manual" }));
      await db.insert(rateMaster).values(rateRecords);

      await db.insert(companySettings).values({
        companyName: "Laxmi Flex Printers", city: "Wardha", state: "Maharashtra",
        invoicePrefix: "INV", quotationPrefix: "QUO", calculationPrefix: "CAL",
        financialYearStart: "04", defaultInvoiceType: "normal", gstEnabled: false,
        defaultCgstPercent: 9, defaultSgstPercent: 9, defaultIgstPercent: 18,
        currency: "INR", printSize: "A5", invoiceFooter: "Thank you for your business!",
      });

      const catCountRes = await db.select({ c: sql<number>`count(*)::int` }).from(expenseCategories);
      if (Number(catCountRes[0]?.c ?? 0) === 0) {
        await db.insert(expenseCategories).values(EXPENSE_CATEGORIES.map((name) => ({ name })));
      }
      seededDefaultData = true;
    }

    return NextResponse.json({
      status: "Setup Complete!",
      login: createdAdmin ? "admin" : null,
      password: createdAdmin ? DEFAULT_PASSWORD : null,
      adminCreated: createdAdmin,
      defaultDataSeeded: seededDefaultData,
      message: createdAdmin
        ? "Tables + admin account तयार आहे. लगेच password बदला आणि login करा."
        : "Tables verified. Admin password अपरिवर्तित राहिले.",
    });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    let hint = "DATABASE_URL बरोबर आहे का आणि database चालू आहे का ते तपासा.";
    if (!process.env.DATABASE_URL) {
      hint = "DATABASE_URL सेट केलेला नाही. .env फाईल किंवा Vercel environment variables तपासा.";
    } else if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|certificate|password authentication failed/i.test(msg)) {
      hint = "Database ला connect होत नाही. DATABASE_URL चा URL / password बरोबर असल्याची खात्री करा.";
    }
    return NextResponse.json({ error: msg, hint }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
