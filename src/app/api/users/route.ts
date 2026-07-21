import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermission, hashPassword, logActivity } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, "users.view");
  if (authResult instanceof Response) return authResult;

  try {
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
    const body = await req.json();
    const { username, password, name, role, email, phone } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Username, password and name are required" }, { status: 400 });
    }

    // Check duplicate username
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
        role: role || "staff",
        email: email || null,
        phone: phone || null,
        createdBy: authResult.id,
      })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      });

    await logActivity(authResult.id, "create", "users", user.id, `Created user: ${username}`);

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}