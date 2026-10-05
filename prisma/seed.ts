// Idempotent seed: upserts all 20 products from docs/catalogue.json.
// Run with `npm run db:seed` (or `npx prisma db seed`).
// Note: Product.tags is a Prisma Json column (SQLite has no scalar lists) —
// we store a real JSON array of strings, validated through parseTags().
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseTags } from "../src/lib/products";

const prisma = new PrismaClient();

type CatalogueEntry = {
  id: string;
  name: string;
  category: string;
  price: number;
  kanji: string;
  meaning: string;
  tags: string[];
  img: string;
  blurb: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  vitamins: "Vitamins",
  devices: "Devices",
  care: "Personal Care",
  baby: "Mother & Baby",
  aid: "First Aid",
};

const FEATURED_IDS = new Set(["vitc", "thermo", "faid"]);

// Short caption lines, derived from each catalogue blurb (PRD: caption is the
// one-line card text under the product name).
const CAPTIONS: Record<string, string> = {
  vitc: "Daily sunshine in a tablet.",
  multi: "All the basics in one tablet.",
  omega: "Small capsule, big favours.",
  iron: "Steady energy, even on heavy days.",
  thermo: "A reading in seconds, not guesses.",
  bp: "Clinic-grade readings at your kitchen table.",
  gluco: "Quick sugar checks, saved to memory.",
  oxi: "Oxygen and pulse in eight seconds flat.",
  sanit: "Clean hands without the chalky feel.",
  sun: "The sunscreen you'll actually wear.",
  tooth: "Whitening without the sting.",
  aloe: "Cooling aloe for skin that's had a long day.",
  lotion: "Mild enough for newborn skin.",
  wipes: "Fragrance-free and kind to sensitive skin.",
  ptest: "Clear results, in your own space and time.",
  shampoo: "No-tears bath time, calm evenings.",
  faid: "The family's quiet hero.",
  band: "Wraps snug, peels kind.",
  antisep: "A tiny bottle of foresight.",
  mask: "Fifty 3-ply masks to a box.",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldString(record: Record<string, unknown>, key: string, where: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`catalogue.json: ${where} has no string "${key}"`);
  }
  return value;
}

function fieldNumber(record: Record<string, unknown>, key: string, where: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`catalogue.json: ${where} has no number "${key}"`);
  }
  return value;
}

function loadCatalogue(): CatalogueEntry[] {
  const file = path.resolve(__dirname, "..", "docs", "catalogue.json");
  const raw = readFileSync(file, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`catalogue.json: expected an array, got ${typeof parsed}`);
  }
  return parsed.map((item, index) => {
    const where = `[${index}]`;
    if (!isRecord(item)) {
      throw new Error(`catalogue.json: ${where} is not an object`);
    }
    const record = item;
    const tags: unknown = record["tags"];
    if (!Array.isArray(tags)) {
      throw new Error(`catalogue.json: ${where} has no "tags" array`);
    }
    return {
      id: fieldString(record, "id", where),
      name: fieldString(record, "name", where),
      category: fieldString(record, "category", where),
      price: fieldNumber(record, "price", where),
      kanji: fieldString(record, "kanji", where),
      meaning: fieldString(record, "meaning", where),
      tags: parseTags(tags),
      img: fieldString(record, "img", where),
      blurb: fieldString(record, "blurb", where),
    };
  });
}

async function main(): Promise<void> {
  const entries = loadCatalogue();
  const seenSlugs = new Set<string>();

  for (const entry of entries) {
    const categoryLabel = CATEGORY_LABELS[entry.category];
    if (!categoryLabel) {
      throw new Error(`catalogue.json: unknown category "${entry.category}" for id "${entry.id}"`);
    }
    const slug = slugify(entry.name);
    if (!slug) {
      throw new Error(`catalogue.json: could not slugify name "${entry.name}"`);
    }
    if (seenSlugs.has(slug)) {
      throw new Error(`catalogue.json: duplicate slug "${slug}"`);
    }
    seenSlugs.add(slug);

    const data = {
      slug,
      name: entry.name,
      category: entry.category,
      categoryLabel,
      caption: CAPTIONS[entry.id] ?? entry.blurb,
      description: entry.blurb,
      price: entry.price,
      image: entry.img,
      kanji: entry.kanji,
      meaning: entry.meaning,
      tags: parseTags(entry.tags),
      featured: FEATURED_IDS.has(entry.id),
      inStock: true,
    };

    await prisma.product.upsert({
      where: { id: entry.id },
      create: { id: entry.id, ...data },
      update: data,
    });
  }

  const count = await prisma.product.count();
  if (count !== entries.length) {
    throw new Error(`seed mismatch: catalogue has ${entries.length} entries, DB now holds ${count}`);
  }
  console.log(`Seeded ${count} products.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
