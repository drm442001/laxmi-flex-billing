import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, sessions, activityLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextRequest } from "next/server";

// ============================================
// PASSWORD
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// TOKEN — Cryptographically secure
// ============================================

export function generateToken(): string {
  // Use Node.js crypto for cryptographically secure random bytes
  // Output: 48 random bytes → 64-char hex string (same length as before)
  const { randomBytes } = require("crypto") as typeof import("crypto");
  return randomBytes(48).toString("base64url");
}

// ============================================
// ROLES & PERMISSIONS
// ============================================

export type Role = "admin" | "staff" | "viewer";

const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "dashboard", "invoice.create", "invoice.edit", "invoice.delete",
    "quotation.create", "quotation.edit", "customer.create", "customer.edit", "customer.delete",
    "payment.create", "expense.create", "purchase.create",
    "reports.view", "settings.view", "settings.edit",
    "users.view", "users.create", "users.edit",
    "trash.view", "trash.restore", "trash.delete",
    "ratemaster.edit", "accounts.view", "search",
  ],
  staff: [
    "dashboard", "invoice.create", "invoice.edit",
    "quotation.create", "quotation.edit", "customer.create", "customer.edit",
    "payment.create", "expense.create", "purchase.create",
    "reports.view", "accounts.view", "search",
    "ratemaster.edit", "trash.view",
  ],
  viewer: [
    "dashboard", "reports.view", "search",
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): string[] {
  return PERMISSIONS[role] || [];
}

// ============================================
// SESSION VERIFICATION
// ============================================

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  email: string | null;
  phone: string | null;
}

export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    // Check cookie first, then Authorization header
    const cookieToken = req.cookies.get("lfp_session")?.value;
    const headerToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) return null;

    // Find valid session
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

    if (!session) return null;

    // Find user
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.isActive, true)));

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as Role,
      email: user.email,
      phone: user.phone,
    };
  } catch {
    return null;
  }
}

// ============================================
// REQUIRE AUTH — returns user or 401 response
// ============================================

export async function requireAuth(req: NextRequest): Promise<AuthUser | Response> {
  const user = await getSessionUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requirePermission(req: NextRequest, permission: string): Promise<AuthUser | Response> {
  const result = await requireAuth(req);
  if (result instanceof Response) return result;

  if (!hasPermission(result.role, permission)) {
    return new Response(JSON.stringify({ error: "Permission denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return result;
}

// ============================================
// ACTIVITY LOG
// ============================================

export async function logActivity(
  userId: number | null,
  action: string,
  module: string,
  recordId?: number,
  details?: string,
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      module,
      recordId: recordId || null,
      newValue: details || null,
    });
  } catch {
    // Non-blocking — don't fail the main operation
  }
}