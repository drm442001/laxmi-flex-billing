import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = await requirePermission(req, "users.view");
  if (authResult instanceof Response) return authResult;

  try {
    const logs = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        module: activityLogs.module,
        recordId: activityLogs.recordId,
        newValue: activityLogs.newValue,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        userName: users.name,
        userRole: users.role,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}