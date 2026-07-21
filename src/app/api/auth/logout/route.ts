import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, logActivity } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const token = req.cookies.get("lfp_session")?.value;

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    if (user) {
      await logActivity(user.id, "logout", "auth");
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("lfp_session", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}