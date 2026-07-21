import { NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster, companySettings, users } from "@/db/schema";
import { PRINT_ITEMS, FRAME_ITEMS, OTHER_ITEMS } from "@/lib/constants";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const adminExists = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (adminExists[0].count === 0) {
      const hashed = await hashPassword("admin123");
      await db.insert(users).values({
        username: "admin",
        password: hashed,
        name: "Administrator",
        role: "admin",
      });
    }

    const existing = await db.select({ count: sql<number>`count(*)` }).from(rateMaster);
    if (existing[0].count === 0) {
      const rateRecords: any[] = [];
      PRINT_ITEMS.forEach((item, i) => rateRecords.push({ category: "print", itemName: item.name, itemCode: "PRT" + i, hsnCode: item.hsn, defaultRate: 0, unit: "Sq.Ft" }));
      FRAME_ITEMS.forEach((item, i) => rateRecords.push({ category: "frame", itemName: item.name, itemCode: "FRM" + i, hsnCode: item.hsn, defaultRate: 0, unit: "R.Ft" }));
      OTHER_ITEMS.forEach((item, i) => rateRecords.push({ category: "other", itemName: item.name, itemCode: "OTH" + i, hsnCode: item.hsn, defaultRate: 0, unit: "Manual" }));
      await db.insert(rateMaster).values(rateRecords);
    }

    const settingsExist = await db.select({ count: sql<number>`count(*)` }).from(companySettings);
    if (settingsExist[0].count === 0) {
      await db.insert(companySettings).values({
          companyName: "Laxmi Flex Printers", city: "Wardha", state: "Maharashtra",
          invoicePrefix: "INV", quotationPrefix: "QUO", calculationPrefix: "CAL",
          financialYearStart: "04", defaultInvoiceType: "normal", gstEnabled: false,
          defaultCgstPercent: 9, defaultSgstPercent: 9, defaultIgstPercent: 18,
          currency: "INR", printSize: "A5", invoiceFooter: "Thank you for your business!",
      });
    }

    return NextResponse.json({ message: "Success! Database is Ready. Login with admin / admin123" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() { return GET(); }
