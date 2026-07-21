import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePermission, logActivity } from "@/lib/auth";

// Get all trashed items
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "trash.view");
  if (auth instanceof Response) return auth;
  try {
    const trashed = await db
      .select()
      .from(estimates)
      .where(eq(estimates.isDeleted, true))
      .orderBy(desc(estimates.deletedAt));

    return NextResponse.json(trashed);
  } catch (error) {
    console.error("Error fetching trash:", error);
    return NextResponse.json({ error: "Failed to fetch trash" }, { status: 500 });
  }
}

// Restore item from trash
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "trash.restore");
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json();
    const { id } = body;

    const [restored] = await db
      .update(estimates)
      .set({
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, id))
      .returning();

    await logActivity(auth.id, "restore", "trash", id, `Restored: ${restored?.invoiceNumber}`);
    return NextResponse.json(restored);
  } catch (error) {
    console.error("Error restoring item:", error);
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
}

// Permanently delete
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "trash.delete");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const all = searchParams.get("all");

    if (all === "true") {
      await db.delete(estimates).where(eq(estimates.isDeleted, true));
      await logActivity(auth.id, "empty_trash", "trash", undefined, "Emptied entire trash");
      return NextResponse.json({ success: true, message: "Trash emptied" });
    }

    if (id) {
      await db.delete(estimates).where(eq(estimates.id, parseInt(id)));
      await logActivity(auth.id, "permanent_delete", "trash", parseInt(id), `Permanently deleted #${id}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting permanently:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}