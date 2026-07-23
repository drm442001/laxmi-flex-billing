import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  customers, vendors, estimates, estimateItems, payments,
  expenses, expenseCategories, purchases, cashBook, ledgerEntries,
  rateMaster, companySettings, users,
} from "@/db/schema";
import { requirePermission } from "@/lib/auth";

// Export-only (no restore endpoint exposed to API; restores must be done out-of-band).
// Returns a JSON download of non-sensitive data. We deliberately exclude the `users`
// password hashes and session tokens from the export.

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "backup.export");
  if (auth instanceof Response) return auth;

  try {
    const [cust, vend, inv, items, pay, exp, expCats, pur, cb, led, rates, settings, userList] = await Promise.all([
      db.select().from(customers),
      db.select().from(vendors),
      db.select().from(estimates),
      db.select().from(estimateItems),
      db.select().from(payments),
      db.select().from(expenses),
      db.select().from(expenseCategories),
      db.select().from(purchases),
      db.select().from(cashBook),
      db.select().from(ledgerEntries),
      db.select().from(rateMaster),
      db.select().from(companySettings),
      db.select({ id: users.id, username: users.username, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt }).from(users),
    ]);

    const backupData = {
      version: "2.1-audited",
      timestamp: new Date().toISOString(),
      exportedBy: { id: auth.id, username: auth.username, role: auth.role },
      data: {
        users: userList,
        companySettings: settings,
        rateMaster: rates,
        customers: cust,
        vendors: vend,
        estimates: inv,
        estimateItems: items,
        payments: pay,
        expenses: exp,
        expenseCategories: expCats,
        purchases: pur,
        cashBook: cb,
        ledger: led,
      },
    };

    const fileName = `laxmi_backup_${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "Backup generation failed" }, { status: 500 });
  }
}
