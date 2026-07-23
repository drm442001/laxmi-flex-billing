import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cashBook } from "@/db/schema";
import { desc, and, gte, lte, sql } from "drizzle-orm";
import { requirePermission, logActivity, parseId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions: ReturnType<typeof gte>[] = [];

    if (from) conditions.push(gte(cashBook.entryDate, from));
    if (to) conditions.push(lte(cashBook.entryDate, to));

    const entries = await db
      .select()
      .from(cashBook)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cashBook.entryDate), desc(cashBook.id));

    // Calculate running balance (oldest → newest)
    const chronological = [...entries].reverse();
    let running = 0;
    const withBalance = chronological.map((entry) => {
      running = running + Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, runningBalance: Number(running.toFixed(2)) };
    });
    const entriesWithBalance = withBalance.reverse();

    const [summary] = await db
      .select({
        totalDebit: sql<number>`coalesce(sum(${cashBook.debit}), 0)`,
        totalCredit: sql<number>`coalesce(sum(${cashBook.credit}), 0)`,
      })
      .from(cashBook)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      entries: entriesWithBalance,
      summary: {
        totalDebit: Number(summary?.totalDebit) || 0,
        totalCredit: Number(summary?.totalCredit) || 0,
        balance: (Number(summary?.totalDebit) || 0) - (Number(summary?.totalCredit) || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching cash book:", error);
    return NextResponse.json({ error: "Failed to fetch cash book" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "cashbook.manage");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const {
      entryDate, entryType, particulars, debit, credit, paymentMethod, notes,
    } = body as Record<string, unknown>;

    if (!particulars || typeof particulars !== "string" || !particulars.trim()) {
      return NextResponse.json({ error: "Particulars is required" }, { status: 400 });
    }
    if (entryType !== "receipt" && entryType !== "payment" && entryType !== "opening") {
      return NextResponse.json({ error: "entryType must be receipt|payment|opening" }, { status: 400 });
    }
    const debitNum = typeof debit === "number" && isFinite(debit) ? Math.max(0, debit) : 0;
    const creditNum = typeof credit === "number" && isFinite(credit) ? Math.max(0, credit) : 0;
    if (debitNum === 0 && creditNum === 0) {
      return NextResponse.json({ error: "debit or credit amount is required" }, { status: 400 });
    }

    const [entry] = await db
      .insert(cashBook)
      .values({
        entryDate: (typeof entryDate === "string" && entryDate) || new Date().toISOString().split("T")[0],
        entryType,
        referenceType: "manual",
        particulars: particulars.slice(0, 200),
        debit: debitNum,
        credit: creditNum,
        paymentMethod: (typeof paymentMethod === "string" && paymentMethod) || "cash",
        notes: typeof notes === "string" ? notes.slice(0, 500) : null,
        createdBy: authP.id,
      })
      .returning();

    await logActivity(authP.id, "create", "cashbook", entry.id, `Manual ${entryType}: ₹${debitNum || creditNum}`);
    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error creating cash book entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
