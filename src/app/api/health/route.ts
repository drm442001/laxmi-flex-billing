import { db, pool } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, message: "Database Connected Successfully!" });
  } catch (err: any) {
    return NextResponse.json({ 
        ok: false, 
        error: err.message,
        details: "Please check your DATABASE_URL and Password in Vercel Settings."
    }, { status: 500 });
  }
}
