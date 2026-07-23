import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

// Whitelist of fields callers may update. Prevents mass-assignment / privilege escalation
// (e.g. overwriting id, created_at, or columns that don't exist).
const ALLOWED_SETTINGS_FIELDS: Record<string, true> = {
  companyName: true, ownerName: true, address: true,
  city: true, state: true, pincode: true, phone: true, mobile: true,
  email: true, website: true, gstNumber: true, panNumber: true,
  bankName: true, bankBranch: true, accountNumber: true, ifscCode: true, upiId: true,
  logoUrl: true, qrCodeUrl: true, signatureUrl: true,
  invoicePrefix: true, quotationPrefix: true, calculationPrefix: true,
  financialYearStart: true, currentFinancialYear: true,
  defaultInvoiceType: true, gstEnabled: true,
  defaultCgstPercent: true, defaultSgstPercent: true, defaultIgstPercent: true,
  defaultDiscountPercent: true, defaultTerms: true, invoiceNotes: true, invoiceFooter: true,
  currency: true, dateFormat: true, printSize: true,
  autoBackup: true, backupFrequency: true,
  enableReminders: true, reminderDays: true,
};

function pickAllowed(body: Record<string, unknown>): Partial<typeof companySettings.$inferInsert> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_SETTINGS_FIELDS[key]) out[key] = body[key];
  }
  return out as Partial<typeof companySettings.$inferInsert>;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const [settings] = await db.select().from(companySettings).limit(1);

    if (!settings) {
      return NextResponse.json({
        companyName: "Laxmi Flex Printers", ownerName: "", address: "",
        city: "Wardha", state: "Maharashtra", pincode: "", phone: "", mobile: "",
        email: "", website: "", gstNumber: "", panNumber: "",
        bankName: "", bankBranch: "", accountNumber: "", ifscCode: "", upiId: "",
        logoUrl: "", qrCodeUrl: "", signatureUrl: "",
        invoicePrefix: "INV", quotationPrefix: "QUO", calculationPrefix: "CAL",
        financialYearStart: "04", currentFinancialYear: "", invoiceCounter: 1,
        defaultInvoiceType: "normal", gstEnabled: false,
        defaultCgstPercent: 9, defaultSgstPercent: 9, defaultIgstPercent: 18,
        defaultDiscountPercent: 0, defaultTerms: "", invoiceNotes: "",
        invoiceFooter: "Thank you for your business!",
        currency: "INR", dateFormat: "DD/MM/YYYY", printSize: "A5",
        autoBackup: false, backupFrequency: "daily",
        enableReminders: true, reminderDays: 7,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
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

    const patch = pickAllowed(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    (patch as any).updatedAt = new Date();

    const [existing] = await db.select().from(companySettings).limit(1);

    if (existing) {
      const [updated] = await db
        .update(companySettings)
        .set(patch)
        .where(eq(companySettings.id, existing.id))
        .returning();
      await logActivity(authP.id, "edit", "settings", existing.id, "Updated company settings");
      return NextResponse.json(updated);
    } else {
      // Seed minimum required fields on first PUT
      const [created] = await db
        .insert(companySettings)
        .values(patch as any)
        .returning();
      await logActivity(authP.id, "create", "settings", created.id, "Created company settings");
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Error updating company settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
