import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { estimates, estimateItems } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { requirePermission, logActivity, parseId } from "@/lib/auth";

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

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "trash.restore");
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json().catch(() => null);
    const id = parseId(body?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [restored] = await db
      .update(estimates)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, id))
      .returning();

    if (!restored) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logActivity(auth.id, "restore", "trash", id, `Restored: ${restored.invoiceNumber}`);
    return NextResponse.json(restored);
  } catch (error) {
    console.error("Error restoring item:", error);
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "trash.delete");
  if (auth instanceof Response) return auth;
  try {
    const searchParams = req.nextUrl.searchParams;
    const idRaw = searchParams.get("id");
    const all = searchParams.get("all");

    if (all === "true") {
      const trashed = await db.select({ id: estimates.id }).from(estimates).where(eq(estimates.isDeleted, true));
      if (trashed.length > 0) {
        const ids = trashed.map((t) => t.id);
        await db.delete(estimateItems).where(inArray(estimateItems.estimateId, ids));
        await db.delete(estimates).where(inArray(estimates.id, ids));
      }
      await logActivity(auth.id, "empty_trash", "trash", undefined, "Emptied entire trash");
      return NextResponse.json({ success: true, message: "Trash emptied" });
    }

    if (idRaw) {
      const id = parseId(idRaw);
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      await db.delete(estimateItems).where(eq(estimateItems.estimateId, id));
      await db.delete(estimates).where(eq(estimates.id, id));
      await logActivity(auth.id, "permanent_delete", "trash", id, `Permanently deleted #${id}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting permanently:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
