import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, sessions, activityLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

// ============================================
// PASSWORD
// ============================================

export const PASSWORD_MIN_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return null;
}

// ============================================
// TOKEN — Cryptographically secure
// ============================================

export function generateToken(): string {
  return randomBytes(48).toString("base64url");
}

// ============================================
// SESSION LIFETIME
// ============================================
// Sessions persist until explicit logout. Default = 30 days, "remember me" = 90 days.
// Sliding refresh: if <7 days remain, bump to 30 more days on activity.
export const SESSION_DEFAULT_DAYS = 30;
export const SESSION_REMEMBER_DAYS = 90;
const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================
// ROLES & PERMISSIONS
// ============================================

export type Role = "admin" | "staff" | "viewer";

const VALID_ROLES: ReadonlySet<Role> = new Set(["admin", "staff", "viewer"]);

export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && VALID_ROLES.has(role as Role);
}

const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "dashboard", "invoice.create", "invoice.edit", "invoice.delete",
    "quotation.create", "quotation.edit", "customer.create", "customer.edit", "customer.delete",
    "payment.create", "expense.create", "expense.edit", "purchase.create",
    "reports.view", "settings.view", "settings.edit",
    "users.view", "users.create", "users.edit",
    "trash.view", "trash.restore", "trash.delete",
    "ratemaster.edit", "accounts.view", "search",
    "backup.export", "cashbook.manage",
  ],
  staff: [
    "dashboard", "invoice.create", "invoice.edit",
    "quotation.create", "quotation.edit", "customer.create", "customer.edit",
    "payment.create", "expense.create", "expense.edit", "purchase.create",
    "reports.view", "accounts.view", "search",
    "ratemaster.edit", "trash.view",
  ],
  viewer: [
    "dashboard", "reports.view", "search", "accounts.view",
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): string[] {
  return PERMISSIONS[role] || [];
}

// ============================================
// INPUT HELPERS
// ============================================

export function parseId(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.trunc(raw) : NaN;
  if (typeof raw !== "string") return NaN;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return NaN;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : NaN;
}

export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || null;
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

function extractToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("lfp_session")?.value;
  const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken || headerToken;
  if (!token || typeof token !== "string" || token.length < 10) return null;
  return token;
}

export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = extractToken(req);
    if (!token) return null;

    const now = new Date();
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)));

    if (!session) return null;

    // Sliding session refresh: if close to expiry, extend by DEFAULT_DAYS.
    // Wrap in void + catch so unhandled rejections can never break the request.
    const timeLeft = new Date(session.expiresAt).getTime() - now.getTime();
    if (timeLeft < SESSION_REFRESH_THRESHOLD_MS) {
      const newExpires = new Date();
      newExpires.setDate(newExpires.getDate() + SESSION_DEFAULT_DAYS);
      void db.update(sessions)
        .set({ expiresAt: newExpires })
        .where(eq(sessions.id, session.id))
        .catch(() => { /* non-fatal */ });
    }

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
    if (!isValidRole(user.role)) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
    };
  } catch {
    return null;
  }
}

// ============================================
// REQUIRE AUTH — returns user or 401 response.
// Also sets a refreshed cookie if session was sliding-extended.
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
// COOKIE OPTIONS (centralised so logout/change-password/login stay consistent)
// ============================================

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeSeconds,
    path: "/" as const,
  };
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
      action: action.slice(0, 64),
      module: module.slice(0, 64),
      recordId: recordId || null,
      newValue: details ? details.slice(0, 2000) : null,
    });
  } catch {
    // Non-blocking
  }
}
