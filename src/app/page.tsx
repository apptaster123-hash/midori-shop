// Home page — server component (PRD §7.2). Fetches the catalogue straight
// from the DB via the Prisma singleton (never over HTTP), maps rows into the
// client-safe Product shape (tags through parseTags, per lib/products), and
// hands them to the client composition root, featured first (same ordering
// contract as GET /api/products: featured desc, createdAt asc).
//
// An unseeded or unreachable database must still render the page shell, so
// the DB call is wrapped and degrades to an empty shelf — never a 500.
import { MidoriShop } from "@/components/midori/midori-shop";
import { prisma } from "@/lib/db";
import { parseTags, type Product } from "@/lib/products";

// Prices and stock are live data; serve the page fresh on every request
// instead of baking the shelf into the build output.
export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];

  try {
    const rows = await prisma.product.findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    });
    products = rows.map((row) => ({
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
  } catch (error) {
    console.error(
      "[app/page] could not load products — rendering the shell with an empty shelf:",
      error,
    );
    products = [];
  }

  return <MidoriShop products={products} />;
}
