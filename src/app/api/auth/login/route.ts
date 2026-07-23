import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import {
  verifyPassword, generateToken, logActivity, getClientIp,
  SESSION_DEFAULT_DAYS, SESSION_REMEMBER_DAYS, sessionCookieOptions,
} from "@/lib/auth";

function dbConfigErrorResponse(error: unknown): NextResponse | null {
  const e = error as any;
  const info = [e?.message, e?.cause?.message, e?.data?.error, e?.cause?.data?.error]
    .filter(Boolean)
    .map(String)
    .join(" ");
  if (/relation .* does not exist/i.test(info)) {
    return NextResponse.json(
      { error: "Database tables तयार नाहीत. browser मध्ये '/api/seed' एकदा उघडा — tables आणि admin आपोआप तयार होतील. मग पुन्हा login करा." },
      { status: 500 }
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|timeout|certificate|self signed|password authentication failed/i.test(info)) {
    return NextResponse.json(
      { error: "Database ला connect होत नाही. DATABASE_URL तपासा आणि database चालू आहे का याची खात्री करा." },
      { status: 500 }
    );
  }
  return null;
}

// Dummy bcrypt hash to do a constant-time compare on missing users (anti enumeration)
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.mVfE0xZ3jK5lR8Qe3g7rJ7xK6Z1W";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const remember = Boolean(body?.remember);

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    if (username.length > 64 || password.length > 256) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.isActive, true)));

    let valid = false;
    if (user) {
      valid = await verifyPassword(password, user.password);
    } else {
      await verifyPassword(password, DUMMY_HASH).catch(() => false);
    }

    if (!user || !valid) {
      await logActivity(null, "login_failed", "auth", undefined, `Failed login for ${username}`);
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = generateToken();
    const expiresAt = new Date();
    const days = remember ? SESSION_REMEMBER_DAYS : SESSION_DEFAULT_DAYS;
    expiresAt.setDate(expiresAt.getDate() + days);
    const ip = getClientIp(req);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: ip || "unknown",
      userAgent: (req.headers.get("user-agent") || "unknown").slice(0, 500),
    });

    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    await logActivity(user.id, "login", "auth");

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    });

    response.cookies.set("lfp_session", token, sessionCookieOptions(days * 24 * 60 * 60));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    const dbError = dbConfigErrorResponse(error);
    if (dbError) return dbError;
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
