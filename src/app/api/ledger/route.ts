import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { desc, and, gte, lte, eq, sql } from "drizzle-orm";
import { requirePermission, parseId } from "@/lib/auth";

const VALID_ACCOUNT_TYPES = new Set(["customer", "vendor", "expense", "income"]);

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const accountType = searchParams.get("accountType");
    const accountIdRaw = searchParams.get("accountId");

    const conditions: ReturnType<typeof eq>[] = [];

    if (from) conditions.push(gte(ledgerEntries.entryDate, from));
    if (to) conditions.push(lte(ledgerEntries.entryDate, to));
    if (accountType) {
      if (!VALID_ACCOUNT_TYPES.has(accountType)) {
        return NextResponse.json({ error: "Invalid accountType" }, { status: 400 });
      }
      conditions.push(eq(ledgerEntries.accountType, accountType));
    }
    if (accountIdRaw !== null) {
      const accountId = parseId(accountIdRaw);
      if (!Number.isFinite(accountId) || accountId <= 0) {
        return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
      }
      conditions.push(eq(ledgerEntries.accountId, accountId));
    }

    const entries = await db
      .select()
      .from(ledgerEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id));

    const summaryByType = await db
      .select({
        accountType: ledgerEntries.accountType,
        totalDebit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
        totalCredit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
      })
      .from(ledgerEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(ledgerEntries.accountType);

    return NextResponse.json({ entries, summaryByType });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}
