import { NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster, companySettings, expenseCategories, users } from "@/db/schema";
import { PRINT_ITEMS, FRAME_ITEMS, OTHER_ITEMS, EXPENSE_CATEGORIES } from "@/lib/constants";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.select({ count: sql<number>`count(*)` }).from(rateMaster);
    if (existing[0].count > 0) {
      // Still ensure admin user exists
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
      return NextResponse.json({ message: "Already seeded" });
    }

    // Seed Rate Master
    const rateRecords: { category: string; itemName: string; itemCode: string; hsnCode: string; defaultRate: number; unit: string }[] = [];

    PRINT_ITEMS.forEach((item, i) => {
      rateRecords.push({ category: "print", itemName: item.name, itemCode: `PRT${(i + 1).toString().padStart(3, "0")}`, hsnCode: item.hsn, defaultRate: 0, unit: "Sq.Ft" });
    });
    FRAME_ITEMS.forEach((item, i) => {
      rateRecords.push({ category: "frame", itemName: item.name, itemCode: `FRM${(i + 1).toString().padStart(3, "0")}`, hsnCode: item.hsn, defaultRate: 0, unit: "R.Ft" });
    });
    OTHER_ITEMS.forEach((item, i) => {
      rateRecords.push({ category: "other", itemName: item.name, itemCode: `OTH${(i + 1).toString().padStart(3, "0")}`, hsnCode: item.hsn, defaultRate: 0, unit: "Manual" });
    });

    await db.insert(rateMaster).values(rateRecords);

    // Seed Company Settings
    const existingSettings = await db.select({ count: sql<number>`count(*)` }).from(companySettings);
    if (existingSettings[0].count === 0) {
      await db.insert(companySettings).values({
        companyName: "Laxmi Flex Printers", city: "Wardha", state: "Maharashtra",
        invoicePrefix: "INV", quotationPrefix: "QUO", calculationPrefix: "CAL",
        financialYearStart: "04", defaultInvoiceType: "normal", gstEnabled: false,
        defaultCgstPercent: 9, defaultSgstPercent: 9, defaultIgstPercent: 18,
        currency: "INR", printSize: "A5", invoiceFooter: "Thank you for your business!",
      });
    }

    // Seed Expense Categories
    const existingExpCat = await db.select({ count: sql<number>`count(*)` }).from(expenseCategories);
    if (existingExpCat[0].count === 0) {
      await db.insert(expenseCategories).values(EXPENSE_CATEGORIES.map((name) => ({ name, isActive: true })));
    }

    // Seed Admin User
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

    return NextResponse.json({ message: "Seeded successfully", count: rateRecords.length });
  } catch (error) {
    console.error("Error seeding:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}