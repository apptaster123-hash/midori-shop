"use client";

// Quick-view modal — PRD §5.8: two-column dialog, zoomable photograph left
// (cursor-following, scale 1.6), details + qty stepper + add-to-cart right.
// Opens from the store's quickViewProductId (card clicks, search results) and
// closes on the × button, backdrop click, or Esc. Backdrop fades 200ms; panel
// scales in from 0.96 + 8px over 300ms var(--ease-calm); body scroll locks.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { fmtGhs, kanjiPlate, parseTags, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";

const MODAL_KEYFRAMES = `
  @keyframes midori-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes midori-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

// Client-session cache of the catalogue. Primed by ShopGrid via
// primeQuickViewCache(); on a miss the modal fetches GET /api/products
// (PRD §9) and accepts either a bare array or a { products: [...] } envelope.
let productCache: Product[] | null = null;

/** Seed the modal's cache with server-mapped products so the first quick view
 *  opens without a network round trip. Safe to call on every render. */
export function primeQuickViewCache(products: Product[]): void {
  productCache = products;
}

/** Narrow an untrusted JSON row into a Product without `any`. */
function toProduct(raw: unknown): Product | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || row.id === "") return null;
  const price = Number(row.price);
  return {
    id: row.id,
    slug: typeof row.slug === "string" && row.slug !== "" ? row.slug : row.id,
    name: typeof row.name === "string" ? row.name : row.id,
    category: typeof row.category === "string" ? row.category : "",
    categoryLabel: typeof row.categoryLabel === "string" ? row.categoryLabel : "",
    caption: typeof row.caption === "string" ? row.caption : "",
    description: typeof row.description === "string" ? row.description : "",
    price: Number.isFinite(price) ? price : 0,
    image: typeof row.image === "string" ? row.image : "",
    kanji: typeof row.kanji === "string" ? row.kanji : "",
    meaning: typeof row.meaning === "string" ? row.meaning : "",
    tags: parseTags(row.tags),
    featured: row.featured === true,
    inStock: row.inStock !== false,
  };
}

function extractProductList(payload: unknown): Product[] {
  let rows: unknown[] | null = null;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (typeof payload === "object" && payload !== null) {
    const candidate = (payload as { products?: unknown }).products;
    if (Array.isArray(candidate)) rows = candidate;
  }
  if (rows === null) return [];
  const products: Product[] = [];
  for (const row of rows) {
    const product = toProduct(row);
    if (product !== null) products.push(product);
  }
  return products;
}

export function QuickViewModal() {
  const quickViewProductId = useStore((s) => s.quickViewProductId);
  const closeQuickView = useStore((s) => s.closeQuickView);
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const openCart = useStore((s) => s.openCart);
  const wishlist = useStore((s) => s.wishlist);

  const open = quickViewProductId !== null;

  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [qty, setQty] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const zoomRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Resolve the product for the current quickViewProductId (cache first).
  useEffect(() => {
    if (quickViewProductId === null) return;
    let cancelled = false;
    setQty(1);
    setZoomed(false);
    setImgFailed(false);

    const cached = productCache?.find((p) => p.id === quickViewProductId);
    if (cached !== undefined) {
      setProduct(cached);
      setStatus("ready");
      return;
    }

    setProduct(null);
    setStatus("loading");

    const load = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`GET /api/products failed with ${res.status}`);
        const payload: unknown = await res.json();
        const list = extractProductList(payload);
        if (list.length > 0) productCache = list;
        const found = list.find((p) => p.id === quickViewProductId) ?? null;
        if (cancelled) return;
        if (found === null) {
          setProduct(null);
          setStatus("error");
        } else {
          setProduct(found);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [quickViewProductId, retryToken]);

  // Esc closes (PRD §4.2 — shared overlay behavior).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeQuickView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeQuickView]);

  // Body scroll locked while open (PRD §4.2).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus to the close button on open; hand focus back on close.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeRef.current?.focus({ preventScroll: true });
    } else {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  // Cursor-following zoom: the .img-zoom utility reads --zoom-x/--zoom-y for
  // transform-origin; the inline transform carries the 1.6 scale. Mouse only —
  // pointerType guard keeps touch taps from latching the zoom on.
  const trackZoomOrigin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const host = zoomRef.current;
    if (host === null) return;
    const rect = host.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    host.style.setProperty("--zoom-x", `${x}%`);
    host.style.setProperty("--zoom-y", `${y}%`);
  };

  const beginZoom = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") setZoomed(true);
  };

  const saved = mounted && product !== null && wishlist.includes(product.id);
  const hasPhoto = product !== null && product.image !== "" && !imgFailed;

  const handleAdd = () => {
    if (product === null || !product.inStock) return;
    addToCart(product.id, qty);
    toast.success(`${product.name} added — your cart is getting healthy.`, {
      action: { label: "View cart", onClick: () => openCart() },
    });
  };

  const handleWishlist = () => {
    if (product === null) return;
    const wasSaved = wishlist.includes(product.id);
    toggleWishlist(product.id);
    toast(wasSaved ? "Removed from wishlist" : "Saved to wishlist");
  };

  const alt =
    product !== null && product.caption !== ""
      ? `${product.name} — ${product.caption}`
      : (product?.name ?? "Product photograph");

  return createPortal(
    <>
      <style>{MODAL_KEYFRAMES}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          aria-hidden="true"
          onClick={closeQuickView}
          className="absolute inset-0 animate-[midori-backdrop-in_200ms_ease-out_both] bg-[rgba(26,31,27,0.4)]"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product !== null ? `Quick view: ${product.name}` : "Product quick view"}
          className="relative z-10 grid max-h-[92dvh] w-full max-w-[896px] animate-[midori-modal-in_300ms_var(--ease-calm)_both] overflow-y-auto rounded-dialog border border-line bg-paper-soft md:grid-cols-2"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={closeQuickView}
            aria-label="Close quick view"
            className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-card border border-line bg-paper-soft/90 text-ink-soft transition duration-200 hover:border-sage hover:text-sage active:scale-[0.97]"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>

          {/* Photograph — 50% of the modal at md+ (PRD §5.8). */}
          <div
            ref={zoomRef}
            onPointerEnter={beginZoom}
            onPointerMove={trackZoomOrigin}
            onPointerLeave={() => setZoomed(false)}
            className="img-zoom group relative aspect-[4/5] bg-sage-mist/40 md:aspect-auto md:min-h-[520px]"
          >
            {product !== null && hasPhoto && (
              <img
                src={product.image}
                alt={alt}
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
                style={zoomed ? { transform: "scale(1.6)" } : undefined}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {product !== null && !hasPhoto && (
              <div
                aria-hidden="true"
                className={`absolute inset-0 kanji-plate-${kanjiPlate(product)} flex flex-col items-center justify-center`}
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
            {product !== null && hasPhoto && (
              <span
                aria-hidden="true"
                className="font-japanese pointer-events-none absolute left-4 top-3 select-none text-7xl leading-none text-ink/10 md:text-8xl"
              >
                {product.kanji}
              </span>
            )}
            {product !== null && hasPhoto && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 left-3 rounded-tag bg-paper/90 px-2.5 py-1.5 text-[11px] font-medium text-ink-soft opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                Hover to zoom
              </span>
            )}
          </div>

          {/* Details — 50% at md+. */}
          <div className="flex flex-col p-6 md:p-10">
            {product === null && status === "loading" && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
                  The Shelf
                </p>
                <h2 className="mt-2 font-display text-[1.5rem] leading-[1.2] text-ink">
                  Opening the shelf…
                </h2>
                <p className="mt-4 text-small text-ink-mute">
                  One moment — picking it up for you.
                </p>
              </div>
            )}

            {product === null && status === "error" && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
                  The Shelf
                </p>
                <h2 className="mt-2 font-display text-[1.5rem] leading-[1.2] text-ink">
                  Something went quiet.
                </h2>
                <p className="mt-4 text-body text-ink-soft">
                  We couldn&rsquo;t open that item — the shelf didn&rsquo;t answer. Check your
                  connection and try again.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setRetryToken((t) => t + 1)}
                    className="rounded-full bg-sage px-5 py-2.5 text-small font-medium text-paper transition-colors duration-200 hover:bg-sage-deep"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={closeQuickView}
                    className="rounded-full border border-line px-5 py-2.5 text-small font-medium text-ink transition-colors duration-200 hover:border-sage hover:text-sage"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {product !== null && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
                  {product.categoryLabel}
                </p>
                <h2 className="mt-2 font-display text-[1.5rem] leading-[1.2] text-ink">
                  {product.name}
                </h2>
                {product.description !== "" && (
                  <p className="mt-4 text-body text-ink-soft">{product.description}</p>
                )}
                <p className="mt-5 text-price font-semibold tabular text-ink">
                  {fmtGhs(product.price)}
                </p>
                <p className="mt-1 text-small text-ink-mute">
                  Sealed &amp; quality-checked by a registered nurse before dispatch — same day if
                  you order before 2pm in Accra.
                </p>

                <div className="mt-6 inline-flex items-center self-start rounded-input border border-line">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:text-sage disabled:opacity-40 disabled:hover:text-ink-soft"
                  >
                    <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <span
                    aria-live="polite"
                    className="w-10 text-center text-[0.95rem] font-semibold tabular text-ink"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    disabled={qty >= 99}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:text-sage disabled:opacity-40 disabled:hover:text-ink-soft"
                  >
                    <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!product.inStock}
                  className="mt-5 w-full rounded-full bg-sage px-6 py-3.5 text-[0.95rem] font-medium text-paper transition duration-200 hover:bg-sage-deep active:scale-[0.97] active:duration-150 disabled:cursor-not-allowed disabled:bg-sage-mist disabled:text-ink-mute disabled:active:scale-100"
                >
                  {product.inStock ? "Add to cart" : "Out of stock"}
                </button>

                <button
                  type="button"
                  onClick={handleWishlist}
                  className="underline-wobble mt-5 self-start text-small font-medium text-ink-soft"
                >
                  {saved ? "Remove from wishlist" : "Save to wishlist"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
