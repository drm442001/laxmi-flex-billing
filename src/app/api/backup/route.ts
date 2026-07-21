import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, customers, payments, expenses, purchases, cashBook, ledgerEntries } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "settings.view");
  if (auth instanceof Response) return auth;

  try {
    // Fetch all critical data for backup
    const backupData = {
      version: "2.0-cloud",
      timestamp: new Date().toISOString(),
      data: {
        customers: await db.select().from(customers),
        estimates: await db.select().from(estimates),
        payments: await db.select().from(payments),
        expenses: await db.select().from(expenses),
        purchases: await db.select().from(purchases),
        cashBook: await db.select().from(cashBook),
        ledger: await db.select().from(ledgerEntries),
      }
    };

    const fileName = `laxmi_backup_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "Backup generation failed" }, { status: 500 });
  }
}