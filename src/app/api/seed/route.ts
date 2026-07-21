import { NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster, companySettings, users } from "@/db/schema";
import { PRINT_ITEMS, FRAME_ITEMS, OTHER_ITEMS } from "@/lib/constants";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    // १. आधीचा ॲडमिन डिलीट करा (Force Clean)
    await db.delete(users).where(eq(users.username, "admin"));

    // २. नवीन ॲडमिन तयार करा
    const hashed = await hashPassword("admin123");
    await db.insert(users).values({
      username: "admin",
      password: hashed,
      name: "Administrator",
      role: "admin",
      isActive: true
    });

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
        status: "Master Reset Successful", 
        login: "admin", 
        password: "admin123",
        message: "Please try logging in now." 
    });
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    let hint = "DATABASE_URL बरोबर आहे का आणि database चालू आहे का ते तपासा.";
    if (/relation .* does not exist/i.test(msg)) {
      hint = "Database tables तयार नाहीत. प्रथम 'npm run db:push' चालवा आणि मग पुन्हा /api/seed उघडा.";
    } else if (!process.env.DATABASE_URL) {
      hint = "DATABASE_URL सेट केलेला नाही. .env फाईल किंवा hosting (Vercel) environment variables तपासा.";
    }
    return NextResponse.json({ error: msg, hint }, { status: 500 });
  }
}
export async function POST() { return GET(); }
