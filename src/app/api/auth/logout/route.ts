import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { getSessionUser, logActivity, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const cookieToken = req.cookies.get("lfp_session")?.value;
    const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const token = cookieToken || headerToken;

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    if (user) {
      await logActivity(user.id, "logout", "auth");
    }

    // Opportunistic cleanup of expired sessions (~1% of requests)
    if (Math.random() < 0.01) {
      db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    // Clear cookie with matching options so the browser actually removes it.
    response.cookies.set("lfp_session", "", {
      ...sessionCookieOptions(0),
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
