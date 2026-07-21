import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { verifyPassword, hashPassword, generateToken, logActivity } from "@/lib/auth";

// First-run bootstrap: on a completely fresh database (zero user accounts),
// automatically create the default admin so the first login works out of the box.
async function ensureDefaultAdminIfNoUsers() {
  const [row] = await db.select({ value: count() }).from(users);
  if (Number(row?.value ?? 0) > 0) return;

  const hashed = await hashPassword("admin123");
  await db
    .insert(users)
    .values({
      username: "admin",
      password: hashed,
      name: "Administrator",
      role: "admin",
      isActive: true,
    })
    .onConflictDoNothing();

  console.warn(
    "[auth] No user accounts found — created default admin (username: admin, password: admin123). Please change the password after logging in."
  );
}

function dbConfigErrorResponse(error: unknown): NextResponse | null {
  const msg = String((error as any)?.message ?? error ?? "");
  if (/relation .* does not exist/i.test(msg)) {
    return NextResponse.json(
      { error: "Database tables तयार नाहीत. DATABASE_URL सेट करून प्रथम 'npm run db:push' चालवा, मग पुन्हा login करा." },
      { status: 500 }
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|timeout|certificate|self signed|password authentication failed/i.test(msg)) {
    return NextResponse.json(
      { error: "Database ला connect होत नाही. DATABASE_URL तपासा आणि database चालू आहे का याची खात्री करा.", detail: msg },
      { status: 500 }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const remember = Boolean(body?.remember);

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Find user; on a fresh database, bootstrap the default admin first
    let [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.isActive, true)));

    if (!user) {
      await ensureDefaultAdminIfNoUsers();
      [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.username, username), eq(users.isActive, true)));
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (remember ? 30 : 1)); // 30 days or 1 day

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    // Log activity
    await logActivity(user.id, "login", "auth");

    // Set cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
      token,
    });

    response.cookies.set("lfp_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    const dbError = dbConfigErrorResponse(error);
    if (dbError) return dbError;
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
