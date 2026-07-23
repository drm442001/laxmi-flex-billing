import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity, parseId } from "@/lib/auth";

const VALID_CATEGORIES = new Set(["print", "frame", "other"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  try {
    const rates = await db.select().from(rateMaster).orderBy(rateMaster.category, rateMaster.itemName);
    return NextResponse.json(rates);
  } catch (error) {
    console.error("Error fetching rates:", error);
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "ratemaster.edit");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { category, itemName, defaultRate, unit } = body;
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (typeof itemName !== "string" || !itemName.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }
    if (itemName.length > 120) {
      return NextResponse.json({ error: "Item name too long" }, { status: 400 });
    }
    const rate = typeof defaultRate === "number" && isFinite(defaultRate) ? Math.max(0, defaultRate) : 0;
    if (typeof unit !== "string" || !unit.trim()) {
      return NextResponse.json({ error: "Unit is required" }, { status: 400 });
    }

    const [rate2] = await db
      .insert(rateMaster)
      .values({ category, itemName: itemName.trim(), defaultRate: rate, unit: unit.trim(), createdBy: authP.id })
      .returning();

    await logActivity(authP.id, "create", "ratemaster", rate2.id, `Rate: ${itemName} = ₹${rate}`);
    return NextResponse.json(rate2);
  } catch (error) {
    console.error("Error creating rate:", error);
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authP = await requirePermission(req, "ratemaster.edit");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const id = parseId(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const rate = typeof body.defaultRate === "number" && isFinite(body.defaultRate) ? Math.max(0, body.defaultRate) : 0;

    const [updated] = await db
      .update(rateMaster)
      .set({ defaultRate: rate, updatedAt: new Date(), updatedBy: authP.id })
      .where(eq(rateMaster.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }
    await logActivity(authP.id, "edit", "ratemaster", id, `Rate updated: ${updated.itemName} = ₹${rate}`);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating rate:", error);
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
  }
}
