import { NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster, companySettings, users, sessions } from "@/db/schema";
import { BOOTSTRAP_STATEMENTS } from "@/db/migrations";
import { PRINT_ITEMS, FRAME_ITEMS, OTHER_ITEMS } from "@/lib/constants";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

// Creates all database tables if they do not exist yet.
// Safe to run again: "already exists" errors are ignored.
function sqlErrorText(e: any): string {
  // drizzle wraps driver errors; pg/pg-mem may nest details in cause/data
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
      // 42P07 duplicate_table, 42701 duplicate_column, 42710 duplicate_object (index/constraint)
      if (code === "42P07" || code === "42701" || code === "42710" || /already exists/i.test(info)) continue;
      problems.push(info || String(e));
    }
  }
  return problems;
}

export async function GET() {
  try {
    // ०. प्रथम सर्व tables तयार करा (नसतील तर) — fresh database वरही थेट चालेल
    const problems = await ensureTablesExist();
    if (problems.length > 0) {
      return NextResponse.json(
        { error: "Tables तयार करताना अडचण: " + problems[0], hint: "DATABASE_URL बरोबर आहे का ते तपासा." },
        { status: 500 }
      );
    }

    // १. ॲडमिन बनवा किंवा password रीसेट करा (UPSERT)
    //    टीप: DELETE+INSERT ऐवजी UPSERT — sessions च्या foreign key
    //    reference मुळे असलेला admin डिलीट करता येत नाही.
    const hashed = await hashPassword("admin123");
    await db
      .insert(users)
      .values({
        username: "admin",
        password: hashed,
        name: "Administrator",
        role: "admin",
        isActive: true
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          password: hashed,
          name: "Administrator",
          role: "admin",
          isActive: true,
          updatedAt: new Date(),
        },
      });

    // २. जुने admin sessions रद्द करा (password reset नंतर सुरक्षिततेसाठी)
    const [adminRow] = await db.select({ id: users.id }).from(users).where(eq(users.username, "admin"));
    if (adminRow) {
      await db.delete(sessions).where(eq(sessions.userId, adminRow.id));
    }

    // ३. रेट मास्टर आणि सेटिंग्स (फक्त नसतील तरच)
    const existing = await db.select().from(rateMaster).limit(1);
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
    }

    return NextResponse.json({
        status: "Setup Complete!",
        login: "admin",
        password: "admin123",
        message: "Tables + admin account तयार आहे. आता login करा."
    });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    let hint = "DATABASE_URL बरोबर आहे का आणि database चालू आहे का ते तपासा.";
    if (!process.env.DATABASE_URL) {
      hint = "DATABASE_URL सेट केलेला नाही. .env फाईल किंवा hosting (Vercel) environment variables तपासा.";
    } else if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|certificate|password authentication failed/i.test(msg)) {
      hint = "Database ला connect होत नाही. DATABASE_URL चा URL / password बरोबर असल्याची खात्री करा.";
    }
    return NextResponse.json({ error: msg, hint }, { status: 500 });
  }
}
export async function POST() { return GET(); }
