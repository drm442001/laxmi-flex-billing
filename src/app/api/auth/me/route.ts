import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getPermissions, Role } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({
      ...user,
      permissions: getPermissions(user.role as Role),
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}