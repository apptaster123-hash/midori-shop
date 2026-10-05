# Midori (緑) — Architecture & PRD v2

> The single source of truth for **Midori v2**: a Next.js 16 e-commerce app for a nurse-led health & wellness shop in Ghana. v1 was a single HTML file. v2 is a full-stack app — database persistence, Google OAuth, Mailgun confirmation emails, a real checkout flow, and the eight interactive UI features from the v1 brief, all rebuilt with a Japanese-minimalist visual system that intentionally rejects the "AI-generated template" signature.

This document is the build spec for the fresh v2 build in this workspace. Everything described here is to be built; §12–14 list optional polish and open questions.

---

## 0. Quick Reference

| Axis | Decision |
|---|---|
| Stack | Next.js 16 (App Router) · TypeScript 5 · Tailwind 4 · Prisma · NextAuth v4 · Mailgun |
| Database | Prisma + SQLite for local dev. Schema is portable to Neon/Supabase Postgres — flip `provider` + `DATABASE_URL`, run `db:push`. |
| Auth | NextAuth v4 + GoogleProvider + PrismaAdapter. Falls back to a demo credentials provider when Google creds are `placeholder`. |
| Email | Mailgun SDK with full HTML template. Falls back to console-log when API key is `placeholder`. |
| Page composition | One continuous scroll at `/`; checkout is a real `/checkout` page. |
| Currency | GHS (Ghana Cedi), whole-number prices. |
| Checkout | Real page: form → submitting → success. WhatsApp deep-link for follow-up. |
| Target feel | Hand-crafted, calm, premium, signed-by-a-nurse — never templated, never AI-default. |

---

## 1. Project Brief

Midori — "green" in Japanese — is a small health & wellness shop in Accra, run by a registered nurse. The shop sells 20 carefully curated products across five categories: vitamins, health devices, personal care, mother & baby, and first aid. The brand promise is: *genuine, sealed, nurse-checked products, delivered to your door — and you can WhatsApp the actual nurse before you buy.*

v2's objective is to make the shop feel like a small atelier that happens to sell online, not like a generic e-commerce template or a Wix starter. Every interaction should communicate calm, competence, and the specific human (the nurse) behind the counter. The technical upgrade — database persistence, real authentication, real email — is invisible to the user; what they experience is a calmer, more confident, more interactive shop.

Success looks like: a first-time visitor lands, senses "this is a real, considered shop" within three seconds, explores products via live search or filter, opens a quick-view, adds to cart, signs in (optionally) with Google, checks out, receives an email confirmation, and never once thinks "this looks like a tutorial."

---

## 2. Design Philosophy — "Don't Look AI-Generated"

AI-generated websites have a recognizable signature: centered hero with smiling stock photo, three feature cards with emoji icons, indigo-to-purple gradient text, generic Inter font, "Get Started" CTA, "Trusted by" grayscale logo strip, dark CTA banner before the footer. v2 rejects every one of these defaults.

### 2.1 Anti-patterns explicitly banned (enforced as acceptance criteria)

1. **No emoji as UI chrome.** Product cards use real photography, not 🍊. Emoji is permitted only inside the testimonial stars (★★★★★) and as playful microcopy in non-marketing surfaces (the empty-cart state, the nurse chat quick-replies).
2. **No centered hero with a smiling stock photo.** The hero is asymmetric — 7/5 split, large serif headline on the left, single quiet product photograph on the right, with a tiny Japanese kanji (`緑`) and a vertical `tategaki` label sitting in negative space.
3. **No 3-card feature grid with icon + title + one-liner.** Replaced with an editorial intro paragraph signed by the nurse, then a 3-item asymmetric featured-products layout (1 large + 2 stacked small) that reads like a magazine spread.
4. **No purple/blue gradients.** Palette is muted sage, ink black, paper cream, and a single warm clay accent. No gradient text. No glassmorphism. No mesh-gradient backgrounds.
5. **No "Lorem-ipsum-feeling" microcopy.** Every sentence is specific (e.g. "Sealed & quality-checked by a registered nurse before dispatch — same day if you order before 2pm in Accra") or removed.
6. **No generic stock illustrations** (unDraw, Storyset, Humaaans). The only illustration is the vertical Japanese tategaki label — three characters, used once.
7. **No "Trusted by" grayscale logo strip.** Replaced with three real testimonials that have full names, neighborhoods, and the specific product each customer bought.
8. **No 4-stat counter section** ("10K+ customers / 4.9 rating"). When numbers appear, they're honest and specific ("312 orders shipped this year — every one nurse-checked").
9. **No giant "Subscribe to our newsletter" dark CTA banner** before the footer. The page ends on a quiet, signed line.
10. **No overrounded pill everything.** Pill buttons for primary CTAs only. Cards use 4–6px corners, inputs use 2px, images use 0px (sharp). The rounding hierarchy is intentional, not uniform.

### 2.2 What "looks hand-crafted" actually means

A site reads as hand-crafted when it shows **specific, opinionated choices** that a viewer can tell a person made. Concretely:

- A typeface pairing that isn't Inter alone. We pair **Fraunces** (display, serif) with **Inter** (body, sans) and use the serif sparingly for headlines and the brand mark. The pairing itself signals "considered."
- An asymmetric grid on the shop page. Not `repeat(4, 1fr)`. A 12-column grid where products sit at varied column-spans and staggered vertical offsets, like a magazine spread.
- A single, signed human voice. Copy is written first-person from the nurse. The about section reads like a handwritten note, not a corporate bio.
- Tiny, intentional Japanese accents. A `緑` next to the wordmark. A subtitle like `元気な毎日を` (a healthy every day). A vertical `tategaki` text label on the side of the hero image — three Japanese characters in a thin column, like a magazine masthead. Used once or twice, never as decoration.
- Real product photography with consistent treatment. Every product shot on the same cream-paper background, lit from the same angle, cropped the same way. Consistency is what signals "real shop" — not the photos themselves.
- Negative space, generously. The hero is mostly empty. The shop grid breathes. Whitespace is the loudest signal of "we are not in a hurry to sell you something."
- Paper grain: a subtle SVG `feTurbulence` noise overlay at ≤5% opacity, plus faint seigaiha wave pattern (SVG) in the footer only (~4% opacity), and a hanko-style stamp badge ("本物保証 · Genuine") rotated -8° used once in the hero and once near checkout.

### 2.3 The "Three-Second Test"

When the page loads, the visitor should be able to answer in under three seconds:
1. What does this shop sell? (Health & wellness products.)
2. Who runs it? (A registered nurse in Ghana.)
3. Why should I trust them? (Nurse-approved, sealed, real person on WhatsApp.)

If any of the three is ambiguous, the design failed.

---

## 3. Visual System

### 3.1 Color tokens (defined in `src/app/globals.css`)

```
--paper:        #F6F1E7   /* warm cream background */
--paper-soft:   #FBF7EE   /* lighter cream for cards */
--ink:          #1A1F1B   /* near-black with green undertone — primary text */
--ink-soft:     #4A524C   /* secondary text */
--ink-mute:     #8A8F87   /* tertiary text, captions */
--sage:         #5B7B5A   /* primary brand green */
--sage-deep:    #2F4A35   /* darker green for hover / nav / footer */
--sage-mist:    #DCE4D6   /* sage tint for tags, hover backgrounds */
--clay:         #B8593E   /* single warm accent — sale badges, cart count, checkout CTA */
--line:         #D7CDB6   /* hairline borders on cream */
```

No other colors. Photographs are the only place where additional color is allowed, and even then they should be color-corrected toward a warm, slightly desaturated treatment so the page stays calm.

### 3.2 Typography (loaded via `next/font/google` in `layout.tsx`)

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display / brand | Fraunces | 400, italic | Serif. Used for H1, H2, brand mark, testimonial quotes, signature line. Never bold. |
| Body | Inter | 300, 400, 500, 600 | Sans. Default body copy + UI labels. |
| Numerals (prices, counts) | Inter (tabular) | 600 | `font-variant-numeric: tabular-nums` for aligned prices in cart/checkout. |
| Japanese accent | Noto Serif JP | 400 | Used only for the kanji accent `緑` and the tategaki label. |

Type scale:
- H1 (hero): `clamp(2.4rem, 5vw, 3.6rem)` Fraunces, line-height 1.05
- H2 (section): `clamp(1.6rem, 3vw, 2.2rem)` Fraunces, line-height 1.2
- H3 (card title): `1rem` Inter 500
- Body: `1.05rem` Inter 400, line-height 1.65
- Small / caption: `0.8125rem` Inter 400, color `--ink-mute`
- Price: `1.05–1.125rem` Inter 600 tabular

### 3.3 Spacing & layout

- Base unit: 4px. All spacing is a multiple of 4.
- Section padding: `clamp(48px, 8vw, 96px)` vertical, `clamp(24px, 6vw, 80px)` horizontal.
- Max content width: 1280px. Hero and shop grid max out at this; about section max 680px (single column reads better narrow).
- Grid: 12-column desktop, collapses to single column under 760px.

### 3.4 Radius hierarchy

- Photographs: 0px (sharp — they read as printed plates)
- Cards: 4px
- Inputs: 2px
- Primary buttons: pill (full radius)
- Tags / badges: 2px (small rectangles, not pills)
- Dialogs / drawers: 6px (subtle, not over-rounded)

### 3.5 Motion

- **200ms ease-out** for hover states (color, background, transform).
- **300ms cubic-bezier(0.22, 1, 0.36, 1)** for layout transitions (drawer slide, modal in, filter change).
- **600ms ease-out** for scroll-reveal (opacity + 12px translateY).
- **No bouncy easings** (no `back`, no `elastic`). They read as cheap.
- **Respects `prefers-reduced-motion`** — all non-essential motion is disabled via CSS media query.

---

## 4. Page Architecture

The home page is one continuous scroll at `/`, top to bottom. Checkout is a real page at `/checkout`.

### 4.1 Top-to-bottom scroll sections at `/`

```
01 — Top ribbon (single line, dismissible)
02 — Sticky nav (logo · search trigger · nav links · wishlist icon · cart icon · Google sign-in)
03 — Hero (asymmetric: headline + small kanji on left, single product photo on right)
04 — Editorial intro (one paragraph, signed by the nurse)
05 — Featured products (3 items, asymmetric layout — 1 large + 2 stacked small)
06 — Shop (filter bar + 12-col asymmetric product grid)
07 — About (narrow column, handwritten voice, signature)
08 — Testimonials (3 cards, varied heights/offsets)
09 — Contact / Ask-a-nurse (quiet, no dark CTA banner)
10 — Footer (single line, signed)
```

### 4.2 Floating surfaces (overlay on top of the page)

```
Cart drawer         (right slide-in)
Wishlist drawer     (left slide-in)
Quick-view modal    (centered, scaled in)
Search overlay      (top-anchored, drops in)
Nurse chat widget    (bottom-right floating button → expands to panel)
Toast notifications (bottom-center, sonner)
/checkout           (real page — form → submitting → success)
```

All overlays share:
- Backdrop: `rgba(26,31,27,0.4)` — click-to-close.
- Esc key closes.
- Body scroll locked while open.
- `prefers-reduced-motion` disables transitions.

---

## 5. Component Specs

### 5.1 Top ribbon
- One line, centered, `--sage-deep` background, `--paper` text, 13px.
- Text: "Sealed & nurse-checked · Free delivery in Accra over GHS 200"
- Close `×` on the right; clicking hides for the session.
- Animate out (slide up + collapse) on close.

### 5.2 Sticky nav
- Background: `--paper-soft` with 1px bottom `--line` border. Not pure white — pure white reads as "generic SaaS."
- Left: wordmark `MIDORI` in Fraunces 1.5rem, with a 1rem `緑` in Noto Serif JP immediately after, color `--sage`.
- Center (desktop only): nav links — Shop, About, Reviews, Contact (anchor links). Inter 500, 0.95rem, `--ink-soft` → `--sage` on hover, with a 1.5px underline that grows from left on hover (200ms).
- Right (always visible): search trigger (`⌕` icon button, opens search overlay, keyboard shortcut Cmd/Ctrl+K), wishlist heart with count badge, cart button with count badge, Google sign-in.
- Mobile: hamburger replaces center nav. Hamburger is a custom three-line icon that morphs into X when open.
- Sticky behavior: nav stays at top; on scroll past 80vh, a subtle shadow appears (`box-shadow: 0 1px 0 rgba(26,31,27,0.06)`).

### 5.3 Search overlay (live search)
- Trigger: clicking `⌕` in nav, OR pressing `Cmd/Ctrl+K` (and `/` when not in an input).
- Overlay: full-screen dim (`rgba(26,31,27,0.4)`) + a top-anchored search panel that drops in from the top (300ms cubic-bezier ease).
- Panel: paper-cream background, single input with thin underline (no border box), placeholder "Search wellness essentials…", autofocus.
- Live results: as the user types, results render below in a list — product thumbnail (40×40), name, category tag, price. Keyboard navigation: ↑/↓ to move, Enter to open quick-view, Esc to close.
- Empty state: when input is empty, show "Popular: Vitamin C, Blood Pressure Monitor, Baby Wipes" as quick chips.
- No-results state: "We don't carry that yet — ask the nurse on WhatsApp →" with a click-to-WhatsApp link.

### 5.4 Hero
- 12-column grid. Left 7 columns: H1 in Fraunces (`Wellness, the calm way.`), a 2-line subhead in Inter explaining the `緑` meaning, two quiet CTAs (`Shop wellness` primary pill, `Ask the nurse →` secondary text link).
- Right 5 columns: a single product photograph (4:5 aspect, sharp corners), with a small vertical Japanese label `tategaki` style running to its left: `健康 / 毎日 / 安心` in Noto Serif JP, thin column, color `--sage-deep`.
- Below the photo, a single caption in 13px `--ink-mute`: "Photographed by nurse Ama · Accra studio · October 2025"
- The hero photo is one of the actual products, styled. Not a stock "wellness" photo.
- A hanko-style stamp badge ("本物保証 · Genuine") rotated -8° near the headline.
- Background: pure `--paper`. No gradient. No image. Just calm.

### 5.5 Editorial intro
- Single paragraph, max 680px wide, centered. 4–5 sentences in the nurse's first-person voice. Ends with a signature styled in Fraunces italic as "Ama, RN · Founder".

### 5.6 Featured products
- 3 products, asymmetric layout: 1 large (cols 1–7) + 2 stacked smaller (cols 8–12, split into two rows).
- Each has: photograph, category tag, product name, caption, click → opens quick-view.

### 5.7 Shop grid
- Filter bar: horizontal list of category tags (All, Vitamins, Devices, Personal Care, Mother & Baby, First Aid). Active tag has `--sage` background and `--paper` text; inactive has `--line` border and `--ink` text.
- Grid: 12 columns. Each card occupies a variable span — some 4 cols, some 6 cols for "spotlight" items. Vertical offsets vary (every other card pulls up 12px or down 16px) so the grid looks like a curated wall, not a uniform spreadsheet.
- Card anatomy:
  - Photograph (square or 4:5, sharp corners). On hover (desktop), the image scales 1.04 with a 400ms ease-out. A small heart icon (`♡`) sits top-right — click to add to wishlist, with a toast confirmation.
  - Below image: category tag (10px, `--sage`, uppercase letter-spacing 0.15em), product name (Inter 500, 0.95rem), one-line caption (13px, `--ink-mute`), price (Inter 600 tabular, 1.05rem, `--ink`).
  - Add-to-cart lives in the quick-view, not on the card. Clicking the card opens quick-view.
  - **Image fallback:** if a photo fails to load (or is missing), replace it with a matcha-tinted gradient block with the product's kanji glyph rendered large at low opacity — this must look intentional, never broken.
- Empty state when a filter has no matches: "No items in this category yet. Ask the nurse →"

### 5.8 Quick-view modal
- Trigger: clicking anywhere on a product card.
- Modal: centered, max-width ≈896px. Two-column inside: photograph on left (50%), details on right (50%).
- Photograph: large, sharp corners. On desktop, hover enables zoom (image scales 1.6 with transform-origin following cursor). Caption "Hover to zoom" appears bottom-left.
- Right column content: category tag, product name (Fraunces 1.5rem), full description, price, quantity stepper (`- 1 +`), Add to Cart button (full width, pill, `--sage`), "Save to wishlist" text link below.
- Close: `×` top-right, click on backdrop, or Esc.
- Animation: backdrop fades (200ms), modal scales from 0.96 + translates 8px up (300ms ease-out).

### 5.9 Cart drawer
- Trigger: clicking cart button in nav.
- Drawer: right-anchored, 400px wide (full-width on mobile), slides in from right (300ms cubic-bezier(0.22, 1, 0.36, 1)).
- Top: "Your cart" in Fraunces 1.25rem, with item count in 13px `--ink-mute` below.
- Free-delivery progress bar: if subtotal < GHS 200, show "Add GHS X more for free delivery in Accra" with a sage progress bar. If subtotal ≥ GHS 200, show "You've unlocked free delivery in Accra."
- Items list (scrollable): each row has thumbnail, name + qty-stepper + price, and a remove `×` (remove animates with height-collapse).
- Empty state: "Your cart is feeling light. Zen light." + a "Browse wellness essentials →" link.
- Bottom: subtotal (tabular), delivery (Free or GHS 25), total (tabular, sage-deep), "Proceed to checkout" button (`--clay` background, full width, pill) → navigates to `/checkout`.

### 5.10 Wishlist drawer
- Trigger: clicking heart icon in nav.
- Drawer: identical shell to cart drawer but left-anchored.
- Items: same row anatomy as cart, but the action is "Move to cart" instead of "Remove."
- Persistence: `localStorage` key `midori-store` (zustand persist middleware, partialized to cart + wishlist only).

### 5.11 Checkout page (NEW)
- Route: `/checkout` — a real page. Triggered by "Proceed to checkout" in cart drawer (or direct URL).
- Layout: form (left, ~3/5) + order summary (right, ~2/5, paper-cream background). Collapses to single column on mobile with the summary collapsed on top.
- **Form fields** (all required unless noted):
  - Full name — text input, autocomplete=name
  - Email — email input, validated with regex, autocomplete=email, hint "We'll send your order confirmation here."
  - Phone (WhatsApp preferred) — text input, autocomplete=tel, min length 8
  - Delivery address — text input, autocomplete=street-address
  - City — text input, default "Accra"
  - Payment method — two-card radio group:
    - "Cash on delivery" (default) — sub: "Pay courier on arrival"
    - "WhatsApp confirm" — sub: "We'll confirm details"
  - Notes (optional) — textarea, placeholder "Delivery instructions, gate codes, etc."
- **Order summary**: list of cart items with thumbnail, name, qty × unit price, line total. Below: subtotal, delivery (Free or GHS 25). Total in `--ink` at the bottom, large, tabular.
- **Prefill from session**: if the user is signed in via Google, name + email auto-fill from `session.user`.
- **Submit button**: "Place order — GHS {total}". Disabled until form is valid.
- **States**:
  - `form` — initial, editable.
  - `submitting` — loader ("Writing your order and sending your confirmation email…"). Form locked.
  - `done` — success screen: large check icon in sage-mist circle, "Thank you, {firstName}." headline, order number in a bordered box, totals, payment-method note, two CTAs: "Continue on WhatsApp" (deep-link with order number pre-filled) + "Keep browsing" (link back to `/`).
  - `error` — inline error banner at top of form, form stays editable.
- **On submit**:
  1. Client-side validation passes.
  2. POST `/api/checkout` with the form payload + cart items.
  3. Server re-fetches products from DB to recompute prices (never trusts client prices).
  4. Server creates `Order` + `OrderItem` rows atomically.
  5. Server dispatches Mailgun email asynchronously (never blocks on failure).
  6. Server returns `{ orderNumber, total, delivery, subtotal }`.
  7. Client transitions to `done` state, clears cart, shows success toast.

### 5.12 Nurse chat widget
- Floating button bottom-right: a small pill, `--sage-deep` background, white `+` icon. On hover, label expands to "Ask a nurse."
- Click: expands into a 340×420 panel — `--paper-soft` background, header with nurse name "Nurse Ama, RN" and a "Usually replies in minutes" status dot.
- Body: a scripted chat. Pre-seeded with one nurse message: "Hello! I'm Nurse Ama. Tell me what you're looking for and I'll help you choose." User can type a free-text reply or pick one of three quick-reply chips:
  - "Help me choose a vitamin"
  - "Blood pressure monitor question"
  - "Where's my order?"
- Quick-replies route to pre-written nurse responses with a "Continue on WhatsApp" CTA at the end. No real AI backend — it's a guided FAQ in a chat costume.

### 5.13 Testimonials
- 3 cards in a 12-column grid, each occupying 4 columns, with **varied vertical offsets** — magazine-spread feel.
- Each card: 5 stars in `--clay` (★★★★★ — drawn as text), quote in Fraunces italic, name + neighborhood + product bought in 13px `--ink-mute`.
- No carousel. No autoplay. Three real stories sit still.

### 5.14 About section
- Narrow column (max 680px), centered. 3 short paragraphs in the nurse's voice. Specific. Mention *why* this shop exists, *what* you check before dispatch, *who* you serve. End with the signature line ("— Ama, RN · Founder").

### 5.15 Contact section
- NOT a dark CTA banner. A quiet, paper-cream section with:
  - One line: "Questions before you order?"
  - Three contact lines — phone tel:+233551632777, WhatsApp https://wa.me/233551632777, email mailto:takumistudio26@gmail.com — each a real link.
  - A "Talk to the nurse" pill button → opens chat widget.

### 5.16 Footer
- Single line, `--sage-deep` background, `--paper` text, 14px.
- "© 2025 Midori Health & Wellness · 緑 · Made in Accra"
- Faint seigaiha wave pattern (SVG) at ~4% opacity.
- That's it. No 4-column footer with link lists. End the page on a quiet, signed line.

### 5.17 Toast notifications (sonner)
- Bottom-center, 320px max width, paper-cream background, 1px `--line` border, 4px radius.
- Auto-dismiss after 3.5s, or on click of the `×`.
- Use cases: add-to-cart (with View-cart action), save-to-wishlist, remove-from-cart, order success ("Order MDR-… confirmed — confirmation email sent to {email}").
- Stack: max 3 visible, oldest dismissed first.

### 5.18 Google sign-in UI
- In nav (desktop): a single "Sign in" text button. On authenticated state: small avatar (image from Google, or initials fallback) + "Sign out" text button.
- Mobile: same, full-width inside hamburger menu.
- No "Continue with Google" branded button — keep it text-only to match the calm aesthetic.
- Auth state consumed via `useSession()` from `next-auth/react`; the tree is wrapped in a `SessionProvider` at the composition root.

---

## 6. Interactivity Inventory

| # | Feature | Trigger | Behavior |
|---|---|---|---|
| 1 | Live search | `⌕` click, Cmd/Ctrl+K, `/` | Top-anchored overlay, instant results, keyboard nav, Esc to close |
| 2 | Quick-view modal | Card click | Two-column modal, image zoom on hover, qty stepper, add to cart |
| 3 | Cart drawer | Cart button click | Right slide-in, qty steppers, live total, free-delivery progress line |
| 4 | Wishlist | Heart icon on card, heart in nav | Left drawer, persists via localStorage, "move to cart" action |
| 5 | Nurse chat widget | Floating button bottom-right | Expands to scripted chat panel, quick-reply chips, routes to WhatsApp |
| 6 | Scroll reveals | IntersectionObserver | Sections fade + 12px slide up, 600ms, staggered by 80ms across siblings |
| 7 | Image zoom | Hover (desktop) | Image scales 1.6 with transform-origin following cursor |
| 8 | Toast notifications | Add-to-cart, wishlist, order success | Bottom-center, 3.5s auto-dismiss, View-cart action |
| 9 | Checkout | "Proceed to checkout" in cart | Real `/checkout` page: form → submitting → success with order number |
| 10 | Google OAuth | "Sign in" in nav | NextAuth + GoogleProvider, falls back to demo creds when unconfigured |
| 11 | Order confirmation email | Successful checkout | Mailgun HTML email, falls back to console-log when unconfigured |
| 12 | Cart count badge | Add/remove from cart | Badge appears on cart icon, clay color |
| 13 | Ribbon dismiss | `×` on ribbon | Hides for session |
| 14 | Sticky nav shadow | Window scroll > 80vh | Subtle box-shadow fades in (200ms) |
| 15 | Hover on product card | Mouseenter (desktop only) | Image scales 1.04, heart icon visible |
| 16 | Hamburger morph | Click | Three-line icon morphs to X |
| 17 | Reduced-motion mode | `prefers-reduced-motion: reduce` | All animations disabled via CSS |

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components for DB fetches, client components for interactivity, file-based API routes |
| Language | TypeScript 5 | Type safety end-to-end (Product, Order, CartLine types) |
| Styling | Tailwind CSS 4 | Utility-first, matches the asymmetric grid needs |
| Icons | lucide-react | Inline SVG icons, 1.5px stroke. No icon emoji. |
| State (client) | Zustand + persist middleware | Cart + wishlist persist to localStorage; UI state resets on reload |
| Database | Prisma ORM + SQLite (dev) | Portable to Postgres/Neon/Supabase by flipping `provider` + `DATABASE_URL`. |
| Auth | NextAuth.js v4 + PrismaAdapter | Google OAuth via GoogleProvider. Falls back to a demo credentials provider when Google creds are placeholder. |
| Email | Mailgun SDK (mailgun.js) | Reliable transactional email. Full HTML template with Midori branding. Falls back to console.log when API key is placeholder. |
| Notifications | sonner | Toast system |

### 7.2 File / folder structure (target)

```
src/
├── app/
│   ├── layout.tsx              # Fraunces + Inter + Noto Serif JP fonts, metadata, Sonner toaster
│   ├── page.tsx                # Server component — fetches products from DB, renders <MidoriShop>
│   ├── checkout/page.tsx       # Checkout page (client) — form → submitting → success
│   ├── globals.css             # Midori design tokens, base styles, utilities
│   └── api/
│       ├── auth/[...nextauth]/route.ts   # NextAuth handler
│       ├── checkout/route.ts             # POST: creates Order + items, sends email
│       ├── products/route.ts             # GET: list products
│       └── seed/route.ts                 # POST: wipe + reseed products
├── components/midori/
│   ├── midori-shop.tsx          # Composition root + SessionProvider wrapper
│   ├── nav.tsx                  # Sticky nav + search trigger + cart/wishlist icons + sign-in
│   ├── sections.tsx             # Ribbon, Hero, EditorialIntro, Featured, About, Testimonials, Contact, Footer
│   ├── shop-grid.tsx            # Filter bar + 12-col asymmetric grid + ProductCard
│   ├── quick-view-modal.tsx     # Two-column modal with image zoom
│   ├── cart-drawer.tsx          # Right slide-in with free-delivery progress
│   ├── wishlist-drawer.tsx      # Left slide-in with move-to-cart
│   ├── search-overlay.tsx       # Top-anchored live search with keyboard nav
│   ├── chat-widget.tsx          # Floating nurse chat with quick-replies
│   └── reveal.tsx               # IntersectionObserver wrapper for scroll reveals
└── lib/
    ├── auth.ts                  # NextAuth config + Google + demo fallback
    ├── auth-client.ts           # primaryProviderId() helper for the sign-in button
    ├── session.ts               # getCurrentUser() helper
    ├── mailgun.ts               # Email render (text + HTML) + send, with demo fallback
    ├── store.ts                 # Zustand store: cart + wishlist + UI state, localStorage persistence
    ├── products.ts              # Types, categories, fmtGhs, delivery calc
    └── db.ts                    # Prisma client singleton
prisma/schema.prisma             # Full data model (see §8)
prisma/seed.ts                   # Seed 20 products
scripts/smoke.mjs                # End-to-end smoke test (starts server, exercises API + DB)
.env / .env.example              # DATABASE_URL, NEXTAUTH_SECRET, Google + Mailgun placeholders
```

### 7.3 State management (client)

Three concerns in a Zustand store (`src/lib/store.ts`), with `persist` middleware writing only `cart` and `wishlist` to `localStorage`:

```ts
const state = {
  cart: CartLine[],               // [{ productId, quantity }]
  wishlist: string[],             // [productId, ...]
  // UI state — not persisted, resets on reload
  cartOpen, wishlistOpen, searchOpen, chatOpen: boolean,
  quickViewProductId: string | null,
}
```

### 7.4 Data flow — the golden path

```
User clicks product card → openQuickView(productId) → QuickViewModal opens
User clicks "Add to cart" → addToCart(productId, qty) → persisted → toast → badge updates
User clicks cart icon → openCart() → CartDrawer computes totals + delivery
User clicks "Proceed to checkout" → navigate to /checkout
User fills form, clicks "Place order"
  → POST /api/checkout with { customer, items }
  → Server: validates → re-fetches prices from DB → creates Order + OrderItem atomically
           → dispatches confirmation email (fire-and-forget) → returns { orderNumber, total, delivery, subtotal }
  → Client transitions to "done" → clearCart() → success toast
User clicks "Continue on WhatsApp"
  → window.open(`https://wa.me/233551632777?text=Hello Midori! I just placed order ${orderNumber}.`)
```

---

## 8. Data Model (Prisma schema)

### 8.1 NextAuth core models
- **User** — id, name, email (unique), emailVerified, image, createdAt, updatedAt + relations to Account, Session, Order
- **Account** — OAuth provider accounts (Google). Standard NextAuth fields.
- **Session** — session-based auth (JWT strategy used, but defined for completeness)
- **VerificationToken** — for email verification flows

### 8.2 Application models
- **Product** — id, slug (unique), name, category, categoryLabel, caption, description, price (Int, GHS), image (URL), kanji, meaning, tags (string list), featured, inStock, timestamps
- **Order** — id, orderNumber (unique, format `MDR-YYYYMMDD-XXXX`), userId (nullable, so guest checkout works), customerName, customerEmail, customerPhone, deliveryAddress, city, paymentMethod ('cod' | 'whatsapp'), notes, subtotal, delivery, total, status (default 'pending'), timestamps + relation to OrderItem
- **OrderItem** — id, orderId, productId, name (snapshot at order time), unitPrice, quantity, lineTotal + unique constraint on (orderId, productId)
- **CartItem / WishlistItem** — per-user sync targets, unique on (userId, productId) — defined for future use

### 8.3 Why `Order` is decoupled from `Product`
- `OrderItem` stores a `name` and `unitPrice` snapshot at order time, so historical orders stay accurate even if the product's price changes later.
- `userId` is nullable to support guest checkout.

---

## 9. API Surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/checkout` | Create order + items, send confirmation email. Returns `{ ok, orderNumber, total, delivery, subtotal }`. |
| GET | `/api/products` | List all products (ordered by featured desc, createdAt asc). |
| POST | `/api/seed` | Wipe + reseed the catalogue. Idempotent. |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler. |

### 9.1 `/api/checkout` validation rules
- Required: customerName, customerEmail, customerPhone, deliveryAddress, city, items
- Email validated with regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`
- Items must be a non-empty array; all `productId` values must exist in the DB (reject unknown IDs with 400)
- Server recomputes subtotal, delivery (free if subtotal ≥ GHS 200, else GHS 25), and total — never trusts client prices
- Order number generated as `MDR-YYYYMMDD-XXXX` where XXXX is a 4-char base36 random
- Order + items created in a single atomic create
- Email dispatch is fire-and-forget (errors caught and logged, never propagated to the client)
- Database access via Prisma only (parameterized by design) — never string-build queries

---

## 10. Accessibility & Mobile

- Semantic landmarks, one h1, logical heading order.
- All interactive elements keyboard-reachable; `:focus-visible` outlines in `--sage`; focus ring 2px persimmon/clay, 2px offset, never removed.
- Esc closes any overlay / drawer / modal.
- ARIA labels on icon-only buttons (search, heart, cart, close, dismiss). All product images have descriptive `alt`.
- Color contrast meets WCAG AA on `--paper`.
- `prefers-reduced-motion: reduce` disables marquee/parallax/reveals/fly-to-cart.
- Tap targets ≥ 44px; no horizontal scroll at 360px viewport.
- Mobile: hamburger menu under 760px; grid collapses to 2 cols under 760px, 1 col under 480px; drawers become full-width under 600px; chat button resizes to 48×48.

---

## 12. Implementation Phases (for the build)

1. **Foundation** — project scaffold, design tokens, fonts, layout, Prisma schema, seed.
2. **Data layer** — types, db singleton, zustand store.
3. **Backend + UI tracks in parallel** — API routes, auth, mailgun, smoke script; nav/sections; grid/quick-view; drawers/search/checkout/chat.
4. **Assembly** — midori-shop.tsx + page.tsx wiring; make `npm run build` pass.
5. **Smoke test** — `node scripts/smoke.mjs` proves the golden path end to end.
6. **Review** — design ban-list review + code correctness review; apply fixes; re-verify.
7. **Docs** — beginner README covering Supabase/Neon, Google Cloud Console, Mailgun setup.

---

## 13. Acceptance Criteria

1. A first-time visitor cannot tell, in under 10 seconds, that the site was built with AI assistance or templated from a starter (§2.1 ban list holds).
2. The Three-Second Test passes (§2.3).
3. Every interactive feature in §6 works as specified.
4. No `alert()` calls remain. All notifications go through the toast system.
5. Cart and wishlist persist across page reloads (localStorage via Zustand persist).
6. All images have `alt` text; all icon buttons have `aria-label`.
7. Keyboard navigation works: Tab through interactive elements; Esc closes overlays; Cmd/Ctrl+K opens search.
8. The page reads as a single human voice (the nurse). Every sentence is specific — no generic marketing filler.
9. The page ends quietly — no dark CTA banner before the footer.
10. Checkout creates an Order row in the DB (verified by the smoke test).
11. Checkout dispatches a confirmation email (demo mode logs it; verified by the smoke test).
12. Google sign-in works in demo mode (real Google creds drop into `.env`).
13. `npm run build` passes and `node scripts/smoke.mjs` exits 0.

---

## 14. Environment Setup (documented in README)

1. **Postgres (Supabase or Neon)** — change `provider = "postgresql"` in `prisma/schema.prisma`, set `DATABASE_URL` to your connection string, run `npx prisma db push` + seed. Schema is portable as-is.
2. **Google OAuth** — create OAuth client at https://console.cloud.google.com/apis/credentials; Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`; put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.
3. **Mailgun** — get API key + domain from https://app.mailgun.com/; put `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL` in `.env`. When set, the demo fallback auto-disables.

---

*Document version: 2.1 (workspace build spec) · Brand: Midori (緑) · Nurse: Ama, RN · Accra, Ghana · WhatsApp: +233 55 163 2777 · Shop email: takumistudio26@gmail.com*
