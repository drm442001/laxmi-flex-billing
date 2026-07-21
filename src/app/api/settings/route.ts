import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default settings
const DEFAULT_SETTINGS = {
  shopName: "Laxmi Flex Printers",
  shopAddress: "Wardha, Maharashtra",
  shopPhone: "",
  shopEmail: "",
  shopGst: "",
  defaultGstPercent: "0",
  defaultDiscountPercent: "0",
  invoicePrefix: "INV",
  quotationPrefix: "QUO",
  calculationPrefix: "CAL",
  invoiceFooter: "Thank you for your business!",
  termsAndConditions: "",
  enableDarkMode: "false",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
};

export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    
    // Merge with defaults
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    allSettings.forEach((s) => {
      if (s.value !== null) {
        result[s.key] = s.value;
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key));

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value: value as string, updatedAt: new Date() })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: value as string });
      }
    }

    // Return all settings
    const allSettings = await db.select().from(settings);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    allSettings.forEach((s) => {
      if (s.value !== null) {
        result[s.key] = s.value;
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}