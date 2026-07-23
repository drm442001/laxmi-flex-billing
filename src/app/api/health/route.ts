import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    // Do NOT leak internal error details (credentials, connection strings) to clients.
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 });
  }
}
