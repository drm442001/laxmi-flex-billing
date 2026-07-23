import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/auth";

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
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

// Whitelist of allowed keys to prevent writing arbitrary values.
const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

function safeValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).slice(0, 500);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const allSettings = await db.select().from(settings);

    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    allSettings.forEach((s) => {
      if (s.value !== null && ALLOWED_KEYS.has(s.key)) {
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
  const authP = await requirePermission(req, "settings.edit");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) continue; // ignore unknown keys
      const strVal = safeValue(value);
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value: strVal, updatedAt: new Date() })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: strVal });
      }
    }

    const allSettings = await db.select().from(settings);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    allSettings.forEach((s) => {
      if (s.value !== null && ALLOWED_KEYS.has(s.key)) {
        result[s.key] = s.value;
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
