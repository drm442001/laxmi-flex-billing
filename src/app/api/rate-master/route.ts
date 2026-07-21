import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateMaster } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission, logActivity } from "@/lib/auth";

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
    const body = await req.json();
    const { category, itemName, defaultRate, unit } = body;

    const [rate] = await db
      .insert(rateMaster)
      .values({ category, itemName, defaultRate, unit })
      .returning();

    await logActivity(authP.id, "create", "ratemaster", rate.id, `Rate: ${itemName} = ₹${defaultRate}`);
    return NextResponse.json(rate);
  } catch (error) {
    console.error("Error creating rate:", error);
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authP = await requirePermission(req, "ratemaster.edit");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json();
    const { id, defaultRate } = body;

    const [rate] = await db
      .update(rateMaster)
      .set({ defaultRate, updatedAt: new Date() })
      .where(eq(rateMaster.id, id))
      .returning();

    await logActivity(authP.id, "edit", "ratemaster", id, `Rate updated: ${rate?.itemName} = ₹${defaultRate}`);
    return NextResponse.json(rate);
  } catch (error) {
    console.error("Error updating rate:", error);
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
  }
}