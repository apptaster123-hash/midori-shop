// GET /api/products — all products, featured first (PRD §9).
// Order: featured DESC, createdAt ASC. Rows are mapped through parseTags()
// because Product.tags is a Prisma Json column (approved deviation).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/products";

// Always serve fresh data — the shop grid and search overlay rely on it.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    });
    const products = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      categoryLabel: row.categoryLabel,
      caption: row.caption,
      description: row.description,
      price: row.price,
      image: row.image,
      kanji: row.kanji,
      meaning: row.meaning,
      tags: parseTags(row.tags),
      featured: row.featured,
      inStock: row.inStock,
    }));
    return NextResponse.json({ products });
  } catch (error) {
    console.error("[api/products] failed to list products:", error);
    return NextResponse.json({ error: "Could not load products right now." }, { status: 500 });
  }
}
