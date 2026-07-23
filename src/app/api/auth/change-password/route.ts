import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  requireAuth, verifyPassword, hashPassword, logActivity,
  validatePasswordStrength, SESSION_DEFAULT_DAYS, sessionCookieOptions, getClientIp,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new passwords are required" }, { status: 400 });
    }
    const pwError = validatePasswordStrength(newPassword);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, authResult.id));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const hashed = await hashPassword(newPassword);
    await db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, authResult.id));

    // Invalidate all sessions for this user (security), then issue a fresh one
    // so the current device stays logged in.
    await db.delete(sessions).where(eq(sessions.userId, authResult.id));

    const newToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DEFAULT_DAYS);
    await db.insert(sessions).values({
      userId: authResult.id,
      token: newToken,
      expiresAt,
      ipAddress: getClientIp(req) || "unknown",
      userAgent: (req.headers.get("user-agent") || "unknown").slice(0, 500),
    });

    await logActivity(authResult.id, "password_change", "auth");

    const response = NextResponse.json({ success: true });
    response.cookies.set("lfp_session", newToken, sessionCookieOptions(SESSION_DEFAULT_DAYS * 24 * 60 * 60));
    return response;
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
