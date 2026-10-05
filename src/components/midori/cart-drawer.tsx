"use client";

// Cart drawer — PRD §5.9. Right slide-in, free-delivery progress, qty steppers,
// height-collapse removal, clay checkout CTA.
//
// Also hosts the small internal helpers shared by the Midori flow components
// (wishlist drawer, search overlay, checkout page): useMountTransition,
// useOverlayScrollLock, useEscapeKey, useProductIndex, ProductThumb.
// Treat those exports as private API between the flow files — not for reuse.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  deliveryFor,
  fmtGhs,
  FREE_DELIVERY_THRESHOLD,
  kanjiPlate,
  parseTags,
  type Product,
} from "@/lib/products";
import { useStore } from "@/lib/store";

/* -------------------------------------------------------------------------
   Shared internals (used by wishlist-drawer / search-overlay / checkout)
------------------------------------------------------------------------- */

let productCache: Product[] | null = null;
let productInflight: Promise<Product[]> | null = null;

/** Accepts a bare array or { products: [...] } / { items: [...] } payloads and
 *  narrows rows into the client Product type (tags via parseTags). */
function normalizeProducts(payload: unknown): Product[] {
  let raw: unknown[] | null = null;
  if (Array.isArray(payload)) {
    raw = payload;
  } else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.products)) raw = obj.products;
    else if (Array.isArray(obj.items)) raw = obj.items;
  }
  if (!raw) return [];
  const out: Product[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    const price =
      typeof row.price === "number" ? row.price : Number(row.price);
    out.push({
      id: row.id,
      slug: typeof row.slug === "string" ? row.slug : row.id,
      name: row.name,
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
    });
  }
  return out;
}

function createProductFetch(): Promise<Product[]> {
  const request = fetch("/api/products", { headers: { Accept: "application/json" } })
    .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
    .then((json) => {
      const list = normalizeProducts(json);
      // Cache only a verified non-empty catalogue. A failed or empty payload
      // must not poison the module cache — cart, wishlist and checkout would
      // otherwise stay bricked (ready with zero products) until a full reload.
      if (list.length > 0) {
        productCache = list;
      } else {
        productInflight = null; // allow a fresh attempt next time it matters
      }
      return list;
    })
    .catch(() => {
      productInflight = null; // allow a fresh attempt next time it matters
      return [] as Product[];
    });
  productInflight = request;
  return request;
}

function fetchProducts(): Promise<Product[]> {
  if (productCache) return Promise.resolve(productCache);
  const current = productInflight ?? createProductFetch();
  return current;
}

/**
 * Resolves the catalogue for flow components. When a `products` prop is given
 * it is used as-is; otherwise the catalogue is fetched once from /api/products
 * and cached at module level for the session.
 */
export function useProductIndex(
  preferred?: Product[],
): { products: Product[]; ready: boolean } {
  const preferProp = preferred !== undefined;
  const [fetched, setFetched] = useState<Product[] | null>(productCache);

  useEffect(() => {
    if (preferProp) return;
    if (productCache) {
      setFetched(productCache);
      return;
    }
    let alive = true;
    void fetchProducts().then((list) => {
      if (alive) setFetched(list);
    });
    return () => {
      alive = false;
    };
  }, [preferProp]);

  if (preferProp) return { products: preferred, ready: true };
  return { products: fetched ?? [], ready: fetched !== null };
}

/** Mount/exit transition: keep the node mounted while the exit animation plays. */
export function useMountTransition(open: boolean, exitMs = 340) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  return { mounted, shown };
}

/** Body scroll lock with a shared reference count (drawers may stack). */
let scrollLockCount = 0;
let scrollLockPrevious = "";

export function useOverlayScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    if (scrollLockCount === 0) {
      scrollLockPrevious = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;
    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = scrollLockPrevious;
        scrollLockPrevious = "";
      }
    };
  }, [open]);
}

/** Esc closes any open overlay (PRD §4.2). */
export function useEscapeKey(open: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onEscape]);
}

/** Product thumbnail with the matcha/kanji fallback (PRD §5.7 image fallback). */
export function ProductThumb({
  product,
  size = 56,
}: {
  product: Product;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = product.image.length > 0 && !failed;
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-card"
      style={{ width: size, height: size }}
    >
      {hasImage ? (
        <img
          src={product.image}
          alt={product.name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`kanji-plate-${kanjiPlate(product)} flex h-full w-full items-center justify-center`}
        >
          <span
            className="font-japanese leading-none text-sage-deep/35"
            style={{ fontSize: Math.round(size * 0.52) }}
          >
            {product.kanji || "緑"}
          </span>
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Cart drawer
------------------------------------------------------------------------- */

const EXIT_MS = 340;

export function CartDrawer({ products }: { products?: Product[] }) {
  const open = useStore((s) => s.cartOpen);
  const closeCart = useStore((s) => s.closeCart);
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const router = useRouter();

  const { products: catalogue, ready } = useProductIndex(products);
  const { mounted, shown } = useMountTransition(open, EXIT_MS);
  useOverlayScrollLock(open);
  useEscapeKey(open, closeCart);

  const panelRef = useRef<HTMLDivElement>(null);
  const [removing, setRemoving] = useState<string[]>([]);

  useEffect(() => {
    if (open && mounted) panelRef.current?.focus();
  }, [open, mounted]);

  const byId = useMemo(
    () => new Map(catalogue.map((p) => [p.id, p] as const)),
    [catalogue],
  );
  const lines = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = byId.get(line.productId);
        return product ? [{ line, product }] : [];
      }),
    [cart, byId],
  );

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.line.quantity, 0);
  const delivery = deliveryFor(subtotal);
  const total = subtotal + delivery;
  const units = lines.reduce((sum, l) => sum + l.line.quantity, 0);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  const handleRemove = (productId: string, name: string) => {
    if (removing.includes(productId)) return;
    setRemoving((prev) => [...prev, productId]);
    window.setTimeout(() => {
      removeFromCart(productId);
      setRemoving((prev) => prev.filter((id) => id !== productId));
      toast(`${name} removed from your cart.`);
    }, 320);
  };

  const proceedToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  if (!mounted) return null;

  const staleCart = cart.length > 0 && ready && lines.length === 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop — rgba(26,31,27,0.4), click-to-close (PRD §4.2) */}
      <div
        aria-hidden="true"
        onClick={closeCart}
        className={`absolute inset-0 bg-[rgba(26,31,27,0.4)] transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-paper-soft rounded-l-dialog transition-transform duration-300 ease-calm min-[600px]:w-[400px] ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between border-b border-line px-6 pb-4 pt-6">
          <div>
            <h2 id="cart-drawer-title" className="font-display text-[1.25rem] leading-tight">
              Your cart
            </h2>
            <p className="mt-0.5 text-small text-ink-mute">
              {units === 1 ? "1 item" : `${units} items`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-sage-mist hover:text-ink"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-[1.35rem] italic leading-snug text-ink">
              Your cart is feeling light. Zen light.
            </p>
            <Link
              href="/#shop"
              onClick={closeCart}
              className="underline-wobble mt-5 inline-block font-medium text-sage"
            >
              Browse wellness essentials
            </Link>
          </div>
        ) : staleCart ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-ink-soft">
              We couldn&apos;t load the items saved in your cart — they may have
              changed since your last visit.
            </p>
            <Link
              href="/#shop"
              onClick={closeCart}
              className="underline-wobble mt-5 inline-block font-medium text-sage"
            >
              Browse wellness essentials
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex-1 px-6 py-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 border-b border-line/60 py-4">
                <span className="h-14 w-14 shrink-0 rounded-card bg-sage-mist/60" />
                <span className="flex-1 space-y-2 py-1">
                  <span className="block h-3 w-3/4 rounded-full bg-sage-mist/60" />
                  <span className="block h-3 w-1/3 rounded-full bg-sage-mist/60" />
                </span>
              </div>
            ))}
            <p className="pt-3 text-small text-ink-mute">Opening your cart…</p>
          </div>
        ) : (
          <>
            {/* Free-delivery progress */}
            <div className="border-b border-line px-6 py-3">
              <p className="text-small text-ink-soft" aria-live="polite">
                {subtotal >= FREE_DELIVERY_THRESHOLD
                  ? "Free delivery, unlocked. Your wallet thanks you."
                  : `Add ${fmtGhs(remaining)} more for free delivery in Accra`}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Progress toward free delivery in Accra"
                className="mt-2 h-1 overflow-hidden rounded-full bg-sage-mist"
              >
                <div
                  className="h-full rounded-full bg-sage transition-[width] duration-300 ease-calm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <ul className="flex-1 overflow-y-auto px-6">
              {lines.map(({ line, product }) => {
                const isRemoving = removing.includes(product.id);
                return (
                  <li
                    key={product.id}
                    className="grid transition-[grid-template-rows,opacity] duration-300 ease-calm"
                    style={{
                      gridTemplateRows: isRemoving ? "0fr" : "1fr",
                      opacity: isRemoving ? 0 : 1,
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex gap-3 border-b border-line/60 py-4">
                        <ProductThumb product={product} size={56} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.95rem] font-medium">
                            {product.name}
                          </p>
                          <p className="tabular text-small text-ink-mute">
                            {fmtGhs(product.price)}
                          </p>
                          <div className="mt-2 inline-flex items-center rounded-input border border-line">
                            <button
                              type="button"
                              onClick={() => setQty(product.id, line.quantity - 1)}
                              disabled={line.quantity <= 1}
                              aria-label={`Decrease quantity of ${product.name}`}
                              className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:text-ink disabled:opacity-40"
                            >
                              <Minus size={13} strokeWidth={1.5} aria-hidden="true" />
                            </button>
                            <span className="tabular w-7 text-center text-small font-medium">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(product.id, line.quantity + 1)}
                              disabled={line.quantity >= 99}
                              aria-label={`Increase quantity of ${product.name}`}
                              className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:text-ink disabled:opacity-40"
                            >
                              <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between py-0.5">
                          <span className="tabular font-semibold">
                            {fmtGhs(product.price * line.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(product.id, product.name)}
                            aria-label={`Remove ${product.name} from cart`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-mute transition-colors duration-200 hover:bg-clay/10 hover:text-clay"
                          >
                            <X size={15} strokeWidth={1.5} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Totals + CTA */}
            <footer className="border-t border-line px-6 py-4">
              <dl className="space-y-1">
                <div className="flex items-baseline justify-between text-small text-ink-soft">
                  <dt>Subtotal</dt>
                  <dd className="tabular font-medium">{fmtGhs(subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between text-small text-ink-soft">
                  <dt>Delivery</dt>
                  <dd className="tabular font-medium">
                    {delivery === 0 ? (
                      <span className="text-sage">Free</span>
                    ) : (
                      fmtGhs(delivery)
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <dt className="text-body">Total</dt>
                  <dd className="text-price tabular font-semibold">
                    {fmtGhs(total)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={proceedToCheckout}
                className="mt-4 w-full rounded-full bg-clay py-3 text-center font-medium text-paper transition-[background-color,transform] duration-200 hover:bg-clay/90 active:scale-[0.97]"
              >
                Proceed to checkout
              </button>
              <p className="mt-3 text-center text-[0.6875rem] tracking-wide text-ink-mute">
                Sealed &amp; nurse-checked before dispatch — same day in Accra if
                you order by 2pm.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
