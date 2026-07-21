import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

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
    const body = await req.json();
    
    const [existing] = await db.select().from(companySettings).limit(1);
    
    if (existing) {
      const [updated] = await db
        .update(companySettings)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(companySettings.id, existing.id))
        .returning();
      await logActivity(authP.id, "edit", "settings", existing.id, "Updated company settings");
      return NextResponse.json(updated);
    } else {
      const [created] = await db
        .insert(companySettings)
        .values(body)
        .returning();
      await logActivity(authP.id, "create", "settings", created.id, "Created company settings");
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Error updating company settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}