// Client-safe product types, category list, money + delivery helpers.
// Pure data only — no server imports, no React, no Prisma.

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  caption: string;
  description: string;
  price: number; // GHS, whole numbers
  image: string;
  kanji: string;
  meaning: string;
  tags: string[];
  featured: boolean;
  inStock: boolean;
}

export type CartLine = { productId: string; quantity: number };

/** The five real categories, in PRD §5.7 filter-bar order.
 *  The "All" chip is a filter state, not a category — prepend it in the shop grid. */
export const CATEGORIES = [
  { value: "vitamins", label: "Vitamins" },
  { value: "devices", label: "Devices" },
  { value: "care", label: "Personal Care" },
  { value: "baby", label: "Mother & Baby" },
  { value: "aid", label: "First Aid" },
] as const;

export const FREE_DELIVERY_THRESHOLD = 200; // GHS
export const DELIVERY_FEE = 25; // GHS

/** Format a whole-number price: 45 -> "GHS 45" */
export function fmtGhs(n: number): string {
  return `GHS ${n}`;
}

/** Delivery fee for a subtotal: free once it reaches the threshold, else the flat fee. */
export function deliveryFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

/** Narrow a DB `tags` value (Prisma Json → JsonValue) into string[].
 *  Non-array input yields []; non-string members are filtered out.
 *  Server mappers MUST call this when mapping Product rows to the Product type. */
export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item === "string") tags.push(item);
  }
  return tags;
}

/** Deterministic kanji-plate tint per product ("a" matcha, "b" clay wash,
 *  "c" warm paper — see .kanji-plate-* in globals.css). Pure function of the
 *  id, so server and client always agree and a shelf of fallback cards
 *  doesn't read as one stamped mold. */
export function kanjiPlate(product: Pick<Product, "id">): "a" | "b" | "c" {
  let hash = 0;
  for (let i = 0; i < product.id.length; i++) {
    hash = (hash * 31 + product.id.charCodeAt(i)) % 997;
  }
  return hash % 3 === 0 ? "a" : hash % 3 === 1 ? "b" : "c";
}
