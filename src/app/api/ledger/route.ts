import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { desc, and, gte, lte, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const accountType = searchParams.get("accountType");
    const accountId = searchParams.get("accountId");

    let conditions: ReturnType<typeof gte>[] = [];
    
    if (from) {
      conditions.push(gte(ledgerEntries.entryDate, from));
    }
    if (to) {
      conditions.push(lte(ledgerEntries.entryDate, to));
    }
    if (accountType) {
      conditions.push(eq(ledgerEntries.accountType, accountType));
    }
    if (accountId) {
      conditions.push(eq(ledgerEntries.accountId, parseInt(accountId)));
    }

    const entries = await db
      .select()
      .from(ledgerEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id));

    // Get summary by account type
    const summaryByType = await db
      .select({
        accountType: ledgerEntries.accountType,
        totalDebit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
        totalCredit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
      })
      .from(ledgerEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(ledgerEntries.accountType);

    return NextResponse.json({
      entries,
      summaryByType,
    });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}