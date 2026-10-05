"use client";

// Midori composition root — PRD §7.2. One client component that owns the
// SessionProvider (next-auth/react) and mounts, in §4.1 scroll order:
// ribbon → nav → hero → editorial intro → featured → shop grid → about →
// testimonials → contact → footer, plus every floating surface (§4.2):
// quick-view, cart drawer, wishlist drawer, search overlay, nurse chat,
// the sonner toaster (§5.17) and the paper-grain veil (§2.2).
//
// Products arrive as a server-mapped array (src/app/page.tsx → parseTags).
// An empty array (unseeded/unreachable DB) still renders the full shell:
// Featured returns null and the shop grid shows its honest empty state.

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import type { Product } from "@/lib/products";
import { BookNurse } from "./book-nurse";
import { CartDrawer } from "./cart-drawer";
import { ChatWidget } from "./chat-widget";
import { Nav } from "./nav";
import { QuickViewModal } from "./quick-view-modal";
import { SearchOverlay } from "./search-overlay";
import { ShopGrid } from "./shop-grid";
import {
  About,
  Contact,
  EditorialIntro,
  Featured,
  Footer,
  Hero,
  Ribbon,
  Testimonials,
} from "./sections";
import { WishlistDrawer } from "./wishlist-drawer";

/** Hero stand-in for the unseeded-database shell (§4.1 item 03 must survive a
 *  failed DB read). It is the real catalogue entry for the Blood Pressure
 *  Monitor (docs/catalogue.json) — the same product page.tsx serves as the
 *  hero once the DB is up, so the photograph never changes out from under the
 *  page. Missing image data would fall back to the matcha kanji plate. */
const HERO_FALLBACK: Product = {
  id: "bp",
  slug: "blood-pressure-monitor",
  name: "Blood Pressure Monitor",
  category: "devices",
  categoryLabel: "Devices",
  caption: "Clinic-grade readings at your kitchen table.",
  description: "Clinic-grade readings at your kitchen table. Your heart's diary.",
  price: 320,
  image:
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=640&q=70",
  kanji: "脈",
  meaning: "pulse",
  tags: ["heart", "monitoring"],
  featured: false,
  inStock: true,
};

/** §5.17 toaster, configured once. Mounted by MidoriShop for `/` and by
 *  /checkout for the order-success toast — the routes never render together,
 *  so exactly one stack exists at a time. */
export function MidoriToaster() {
  return (
    <Toaster
      position="bottom-center"
      duration={3500}
      visibleToasts={3}
      toastOptions={{
        style: {
          maxWidth: "320px",
          backgroundColor: "var(--paper-soft)",
          border: "1px solid var(--line)",
          borderRadius: "4px",
          color: "var(--ink)",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          boxShadow: "0 12px 32px rgba(26, 31, 27, 0.14)",
        },
      }}
    />
  );
}

export function MidoriShop({ products }: { products: Product[] }) {
  // §5.4 — the hero wears one real product. Prefer the Blood Pressure Monitor
  // (the product the testimonials and the nurse chat both speak about); fall
  // back to the first server product, then to the static stand-in.
  const heroProduct =
    products.find((product) => product.id === HERO_FALLBACK.id) ??
    products[0] ??
    HERO_FALLBACK;
  // §5.6 — the featured trio, in the server's order (featured desc, createdAt asc).
  const featured = products.filter((product) => product.featured);

  return (
    <SessionProvider>
      <div id="top" className="relative">
        <div className="paper-grain" aria-hidden="true" />
        <Ribbon />
        <Nav />
        <main>
          <Hero product={heroProduct} />
          <EditorialIntro />
          <Featured products={featured} />
          <ShopGrid products={products} />
          <About />
          <Testimonials />
          <BookNurse />
          <Contact />
        </main>
        <Footer />
      </div>

      {/* §4.2 — floating surfaces. All overlays read their open state from the
          zustand store; each locks scroll and closes on Esc by itself. */}
      <QuickViewModal />
      <CartDrawer products={products} />
      <WishlistDrawer products={products} />
      <SearchOverlay products={products} />
      <ChatWidget />

      {/* §5.17 — bottom-center, 320px cap, paper-soft on a hairline border,
          4px radius, 3.5s auto-dismiss, at most 3 visible. */}
      <MidoriToaster />
    </SessionProvider>
  );
}
