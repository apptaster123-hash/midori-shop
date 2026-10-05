"use client";

// Search overlay — PRD §5.3. Top-anchored panel that drops in; underline
// input with live results over name + category + tags; keyboard navigation
// (↑/↓ to move, Enter → quick-view, Esc to close). The nav track owns the
// Cmd/Ctrl+K and "/" triggers — this component only reacts to store state.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { fmtGhs, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import {
  ProductThumb,
  useEscapeKey,
  useMountTransition,
  useOverlayScrollLock,
} from "@/components/midori/cart-drawer";

const POPULAR = ["Vitamin C", "Blood Pressure Monitor", "Baby Wipes"] as const;

const WHATSAPP_URL = "https://wa.me/233551632777";

export function SearchOverlay({ products }: { products: Product[] }) {
  const open = useStore((s) => s.searchOpen);
  const closeSearch = useStore((s) => s.closeSearch);
  const openQuickView = useStore((s) => s.openQuickView);

  const { mounted, shown } = useMountTransition(open);
  useOverlayScrollLock(open); // body scroll locked while open (PRD §4.2)
  useEscapeKey(open, closeSearch);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  // Fresh slate each time the overlay opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(-1);
    }
  }, [open]);

  useEffect(() => {
    if (open && mounted) inputRef.current?.focus();
  }, [open, mounted]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [products, q]);

  // Keep the highlighted option in view while arrowing through results.
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (index: number) => {
    const product = results[index];
    if (!product) return;
    closeSearch();
    openQuickView(product.id);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length === 0 ? -1 : (i + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) =>
        results.length === 0 ? -1 : (i - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active >= 0 ? active : 0);
    }
  };

  if (!mounted) return null;

  const activeId = active >= 0 && results[active] ? `midori-search-option-${results[active].id}` : undefined;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={closeSearch}
        className={`absolute inset-0 bg-[rgba(26,31,27,0.4)] transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className={`absolute inset-x-0 top-0 border-b border-line bg-paper transition-transform duration-300 ease-calm ${
          shown ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto w-full max-w-[680px] px-5 pb-6 pt-5 min-[600px]:px-6">
          <div className="flex items-center gap-3 border-b border-line pb-3 transition-colors duration-200 focus-within:border-sage">
            <Search size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-mute" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="midori-search-results"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search wellness essentials"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search wellness essentials…"
              className="w-full bg-transparent text-[1.05rem] text-ink placeholder:text-ink-mute"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-sage-mist hover:text-ink"
            >
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {q === "" ? (
            <div className="pt-5">
              <p className="text-small text-ink-mute">Popular:</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {POPULAR.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="rounded-tag border border-line px-3 py-1.5 text-small text-ink-soft transition-colors duration-200 hover:border-sage hover:bg-sage-mist/60 hover:text-ink"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="pt-5 text-[0.95rem] text-ink-soft">
              We don&apos;t carry that yet —{" "}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-wobble font-medium text-sage"
              >
                ask the nurse on WhatsApp
              </a>
            </p>
          ) : (
            <ul
              id="midori-search-results"
              ref={listRef}
              role="listbox"
              aria-label="Search results"
              className="max-h-[50vh] overflow-y-auto pt-2"
            >
              {results.map((product, index) => (
                <li
                  key={product.id}
                  role="option"
                  id={`midori-search-option-${product.id}`}
                  aria-selected={index === active}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(index)}
                    className={`flex w-full items-center gap-3 rounded-card px-2 py-2.5 text-left transition-colors duration-150 ${
                      index === active ? "bg-sage-mist/70" : ""
                    }`}
                  >
                    <ProductThumb product={product} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-medium">
                        {product.name}
                      </span>
                      <span className="text-[0.625rem] uppercase tracking-[0.15em] text-sage">
                        {product.categoryLabel}
                      </span>
                    </span>
                    <span className="tabular text-small font-semibold">
                      {fmtGhs(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
