import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cashBook } from "@/db/schema";
import { desc, and, gte, lte, sql } from "drizzle-orm";
import { requirePermission, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let conditions: ReturnType<typeof gte>[] = [];
    
    if (from) {
      conditions.push(gte(cashBook.entryDate, from));
    }
    if (to) {
      conditions.push(lte(cashBook.entryDate, to));
    }

    const entries = await db
      .select()
      .from(cashBook)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cashBook.entryDate), desc(cashBook.id));

    // Calculate running balance
    const entriesWithBalance = entries.reverse().reduce((acc, entry, index) => {
      const prevBalance = index > 0 ? acc[index - 1].runningBalance : 0;
      const runningBalance = prevBalance + (entry.debit || 0) - (entry.credit || 0);
      acc.push({ ...entry, runningBalance });
      return acc;
    }, [] as (typeof entries[0] & { runningBalance: number })[]);

    // Get summary
    const [summary] = await db
      .select({
        totalDebit: sql<number>`coalesce(sum(${cashBook.debit}), 0)`,
        totalCredit: sql<number>`coalesce(sum(${cashBook.credit}), 0)`,
      })
      .from(cashBook)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      entries: entriesWithBalance.reverse(),
      summary: {
        totalDebit: summary?.totalDebit || 0,
        totalCredit: summary?.totalCredit || 0,
        balance: (summary?.totalDebit || 0) - (summary?.totalCredit || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching cash book:", error);
    return NextResponse.json({ error: "Failed to fetch cash book" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entryDate,
      entryType,
      particulars,
      debit,
      credit,
      paymentMethod,
      notes,
    } = body;

    const [entry] = await db
      .insert(cashBook)
      .values({
        entryDate: entryDate || new Date().toISOString().split("T")[0],
        entryType,
        referenceType: "manual",
        particulars,
        debit: debit || 0,
        credit: credit || 0,
        paymentMethod: paymentMethod || "cash",
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error creating cash book entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}