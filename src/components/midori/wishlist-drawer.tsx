"use client";

// Wishlist drawer — PRD §5.10. Same shell as the cart drawer but
// left-anchored; rows offer "Move to cart" (addToCart + remove from wishlist).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { fmtGhs, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import {
  ProductThumb,
  useEscapeKey,
  useMountTransition,
  useOverlayScrollLock,
  useProductIndex,
} from "@/components/midori/cart-drawer";

const EXIT_MS = 340;

export function WishlistDrawer({ products }: { products?: Product[] }) {
  const open = useStore((s) => s.wishlistOpen);
  const closeWishlist = useStore((s) => s.closeWishlist);
  const wishlist = useStore((s) => s.wishlist);
  const addToCart = useStore((s) => s.addToCart);
  const toggleWishlist = useStore((s) => s.toggleWishlist);

  const { products: catalogue, ready } = useProductIndex(products);
  const { mounted, shown } = useMountTransition(open, EXIT_MS);
  useOverlayScrollLock(open);
  useEscapeKey(open, closeWishlist);

  const panelRef = useRef<HTMLDivElement>(null);
  const [moving, setMoving] = useState<string[]>([]);

  useEffect(() => {
    if (open && mounted) panelRef.current?.focus();
  }, [open, mounted]);

  const byId = useMemo(
    () => new Map(catalogue.map((p) => [p.id, p] as const)),
    [catalogue],
  );
  const items = useMemo(
    () =>
      wishlist.flatMap((productId) => {
        const product = byId.get(productId);
        return product ? [{ productId, product }] : [];
      }),
    [wishlist, byId],
  );

  const moveToCart = (productId: string, name: string) => {
    if (moving.includes(productId)) return;
    setMoving((prev) => [...prev, productId]);
    window.setTimeout(() => {
      addToCart(productId, 1);
      toggleWishlist(productId); // present → removes it from the wishlist
      toast.success(`${name} moved to your cart.`);
      setMoving((prev) => prev.filter((id) => id !== productId));
    }, 320);
  };

  if (!mounted) return null;

  const staleWishlist = wishlist.length > 0 && ready && items.length === 0;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={closeWishlist}
        className={`absolute inset-0 bg-[rgba(26,31,27,0.4)] transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-drawer-title"
        className={`absolute inset-y-0 left-0 flex w-full flex-col border-r border-line bg-paper-soft rounded-r-dialog transition-transform duration-300 ease-calm min-[600px]:w-[400px] ${
          shown ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between border-b border-line px-6 pb-4 pt-6">
          <div>
            <h2 id="wishlist-drawer-title" className="font-display text-[1.25rem] leading-tight">
              Your wishlist
            </h2>
            <p className="mt-0.5 text-small text-ink-mute">
              {items.length === 1 ? "1 saved" : `${items.length} saved`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWishlist}
            aria-label="Close wishlist"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-sage-mist hover:text-ink"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        {wishlist.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-[1.35rem] italic leading-snug text-ink">
              Nothing saved yet.
            </p>
            <p className="mt-2 text-small text-ink-mute">
              Tap the heart on anything you like — it waits for you here.
            </p>
            <Link
              href="/#shop"
              onClick={closeWishlist}
              className="underline-wobble mt-5 inline-block font-medium text-sage"
            >
              Browse wellness essentials
            </Link>
          </div>
        ) : staleWishlist ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-ink-soft">
              We couldn&apos;t load your saved items — they may no longer be
              stocked.
            </p>
            <Link
              href="/#shop"
              onClick={closeWishlist}
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
            <p className="pt-3 text-small text-ink-mute">Opening your wishlist…</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-6">
            {items.map(({ productId, product }) => {
              const isMoving = moving.includes(productId);
              return (
                <li
                  key={productId}
                  className="grid transition-[grid-template-rows,opacity] duration-300 ease-calm"
                  style={{
                    gridTemplateRows: isMoving ? "0fr" : "1fr",
                    opacity: isMoving ? 0 : 1,
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
                        <button
                          type="button"
                          onClick={() => moveToCart(productId, product.name)}
                          className="underline-wobble mt-2 inline-block text-small font-medium text-sage"
                        >
                          Move to cart
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
