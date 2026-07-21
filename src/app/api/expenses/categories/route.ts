import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenseCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts.view");
  if (auth instanceof Response) return auth;
  try {
    const categories = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.isActive, true))
      .orderBy(expenseCategories.name);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authP = await requirePermission(req, "expense.create");
  if (authP instanceof Response) return authP;
  try {
    const body = await req.json();
    const { name, description } = body;
    const [category] = await db
      .insert(expenseCategories)
      .values({ name, description: description || null })
      .returning();
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}