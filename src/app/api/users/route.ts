import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermission, hashPassword, logActivity, isValidRole, validatePasswordStrength } from "@/lib/auth";

// Non-admins may only be created/edited by admins; this is already enforced by
// permissions, but additionally validate role values and passwords to prevent
// escalation (e.g. staff creating admin) and weak passwords.

export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, "users.view");
  if (authResult instanceof Response) return authResult;

  try {
    // Never expose password hashes
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requirePermission(req, "users.create");
  if (authResult instanceof Response) return authResult;

  try {
    // Only admins can create users (permissions enforce this, but be explicit)
    if (authResult.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create users" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const requestedRole = body.role;

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Username, password and name are required" }, { status: 400 });
    }
    if (username.length < 3 || username.length > 32 || !/^[a-z0-9_.-]+$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3-32 chars (letters, digits, _ . -)" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 });
    }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    // Prevent privilege escalation: only allow known role values; only admins
    // may create other admins.
    let role: "admin" | "staff" | "viewer" = "staff";
    if (requestedRole !== undefined) {
      if (!isValidRole(requestedRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      role = requestedRole;
    }

    // Optional field validation
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    if (phone && phone.length > 20) {
      return NextResponse.json({ error: "Phone number too long" }, { status: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.username, username));
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        name,
        role,
        email,
        phone,
        createdBy: authResult.id,
      })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      });

    await logActivity(authResult.id, "create", "users", user.id, `Created user: ${username} (${role})`);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
