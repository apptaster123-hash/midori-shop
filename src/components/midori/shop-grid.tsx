"use client";

// Shop grid — PRD §5.7: editorial header, category filter bar, and a
// 12-column asymmetric product wall. Heart clicks write the wishlist and card
// clicks open the quick view; both go through the Midori store — no local
// copies of cart/wishlist state.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, fmtGhs, kanjiPlate, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { primeQuickViewCache } from "@/components/midori/quick-view-modal";

const WHATSAPP_URL = "https://wa.me/233551632777";

type Filter = "all" | (typeof CATEGORIES)[number]["value"];

type Placement = { span: string; offset: string; aspect: string };

/** Curated placement cycle — rows of (5·4·3)(3·5·4) columns with staggered
 *  vertical offsets, so twenty cards read as a magazine wall (PRD §5.7:
 *  "a curated wall, not a uniform spreadsheet"). Spans only apply at lg+;
 *  below that the grid is 2-col (≥480px) or 1-col, per PRD §10. */
const PLACEMENTS: readonly Placement[] = [
  { span: "lg:col-span-5", offset: "", aspect: "aspect-square" },
  { span: "lg:col-span-4", offset: "min-[480px]:mt-6 lg:mt-4", aspect: "aspect-[4/5]" },
  { span: "lg:col-span-3", offset: "min-[480px]:mt-6 lg:-mt-3", aspect: "aspect-[4/5]" },
  { span: "lg:col-span-3", offset: "min-[480px]:mt-6 lg:mt-4", aspect: "aspect-[4/5]" },
  { span: "lg:col-span-5", offset: "min-[480px]:mt-6", aspect: "aspect-square" },
  { span: "lg:col-span-4", offset: "min-[480px]:mt-6 lg:-mt-4", aspect: "aspect-[4/5]" },
];

/** A lone card left in the last row gets half the wall and a gentle pull-down,
 *  so filtered categories (4 items each) still end on an intentional note. */
function placementFor(index: number, remaining: number): Placement {
  if (remaining === 1) {
    return { span: "lg:col-span-6", offset: "min-[480px]:mt-6 lg:mt-4", aspect: "aspect-square" };
  }
  return PLACEMENTS[index % PLACEMENTS.length];
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-tag border px-4 text-small font-medium transition duration-200 active:scale-[0.97] ${
        active
          ? "border-sage bg-sage text-paper"
          : "border-line bg-transparent text-ink hover:border-sage hover:text-sage"
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product, placement }: { product: Product; placement: Placement }) {
  const openQuickView = useStore((s) => s.openQuickView);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const inWishlist = useStore((s) => s.wishlist.includes(product.id));
  const [mounted, setMounted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Wishlist persists to localStorage (zustand persist) — gate the filled
  // heart on mount so SSR and the first client render agree (hydration).
  useEffect(() => setMounted(true), []);

  const saved = mounted && inWishlist;
  const hasPhoto = product.image !== "" && !imgFailed;

  const handleHeart = () => {
    toggleWishlist(product.id);
    toast(saved ? "Removed from wishlist" : "Saved to wishlist");
  };

  const alt = product.caption !== "" ? `${product.name} — ${product.caption}` : product.name;

  return (
    <article className="group relative">
      <div className="relative overflow-hidden bg-sage-mist/40">
        {hasPhoto ? (
          <img
            src={product.image}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className={`${placement.aspect} w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]`}
          />
        ) : (
          /* ui-spec §4 fallback: tinted plate + large kanji — looks intentional, never broken. */
          <div
            aria-hidden="true"
            className={`${placement.aspect} kanji-plate-${kanjiPlate(product)} flex w-full flex-col items-center justify-center`}
          >
            {product.kanji !== "" && (
              <span className="font-japanese text-8xl leading-none text-sage-deep/40">
                {product.kanji}
              </span>
            )}
            {product.meaning !== "" && (
              <span className="mt-3 text-[10px] uppercase tracking-[0.2em] text-sage-deep/70">
                {product.meaning}
              </span>
            )}
          </div>
        )}
        {hasPhoto && (
          <span
            aria-hidden="true"
            className="font-japanese pointer-events-none absolute bottom-1 left-3 select-none text-6xl leading-none text-ink/10"
          >
            {product.kanji}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
          {product.categoryLabel}
        </p>
        <h3 className="mt-1 text-[0.95rem] font-medium text-ink">{product.name}</h3>
        {product.caption !== "" && (
          <p className="mt-0.5 truncate text-small text-ink-mute">{product.caption}</p>
        )}
        <p className="mt-2 text-price font-semibold tabular text-ink">{fmtGhs(product.price)}</p>
      </div>

      {/* Whole-card click target; the heart (z-20) sits above it. */}
      <button
        type="button"
        onClick={() => openQuickView(product.id)}
        aria-label={`Quick view — ${product.name}, ${fmtGhs(product.price)}`}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      <button
        type="button"
        onClick={handleHeart}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-card border border-line/70 bg-paper/85 text-ink-soft transition-colors duration-200 hover:border-sage hover:text-sage"
      >
        <Heart
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className={saved ? "fill-clay text-clay" : ""}
        />
      </button>
    </article>
  );
}

export function ShopGrid({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  // Hand the server-mapped catalogue to the quick-view modal so the first
  // open is instant; the modal still fetches /api/products on a cache miss.
  useEffect(() => {
    primeQuickViewCache(products);
  }, [products]);

  const filtered = useMemo(
    () => (filter === "all" ? products : products.filter((p) => p.category === filter)),
    [products, filter],
  );

  const emptyCategoryLabel =
    CATEGORIES.find((category) => category.value === filter)?.label ?? "the shop";
  const whatsappHref = `${WHATSAPP_URL}?text=${encodeURIComponent(
    `Hello Nurse Elizabeth! I'm looking for something in ${emptyCategoryLabel}.`,
  )}`;

  return (
    <section
      id="shop"
      aria-labelledby="shop-title"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 py-16 md:px-12 md:py-24 lg:px-20"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:mb-14">
        <div className="max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage">
            02 — The Shelf
          </p>
          <h2 id="shop-title" className="mt-3 text-h2 text-ink">
            Small shelf, on purpose.
          </h2>
          <p className="mt-3 max-w-md text-body text-ink-soft">
            Sealed, nurse-checked before dispatch, and stocked small — if it&rsquo;s on the shelf,
            it&rsquo;s because I&rsquo;d hand it to my own family.
          </p>
        </div>
        <p className="text-small tabular text-ink-mute">
          {filtered.length} of {products.length} items
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter the shelf by category"
        className="mb-10 flex flex-wrap items-center gap-2 lg:mb-12"
      >
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category.value}
            active={filter === category.value}
            onClick={() => setFilter(category.value)}
          >
            {category.label}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-soft px-6 py-10 sm:px-10">
          <p className="text-body text-ink-soft">
            No items in this category yet.{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-wobble font-medium text-ink"
            >
              Ask the nurse →
            </a>
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-x-5 gap-y-12 min-[480px]:grid-cols-2 min-[480px]:gap-x-6 lg:grid-cols-12 lg:gap-y-14">
          {filtered.map((product, index) => {
            const placement = placementFor(index, filtered.length - index);
            return (
              <li key={product.id} className={`${placement.span} ${placement.offset}`}>
                <ProductCard product={product} placement={placement} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
