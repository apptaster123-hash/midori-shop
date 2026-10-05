# Midori — UI & Interaction Spec (v1 heritage, still binding on feel)

This is the original UI-focused spec. The stack has moved on (Next.js app, see PRD.md), but the
art direction, motifs, copy voice, and anti-generic rules below remain binding.

## 1. Overview
A shop website for Midori, a wellness shop founded by a registered nurse.
**Feel:** a calm Japanese apothecary / editorial magazine — warm paper, matcha greens,
hand-made details. It must feel designed by a human with taste, not generated.

## 2. Allowed externals
Google Fonts via `next/font`. All icons as inline SVG (Lucide-style, 1.5px stroke). No icon emoji.

## 3. Anti-Generic Rules (hard requirements — this is the "not AI-generated" list)
- ❌ No purple/indigo gradients, no default blue, no glassmorphism card rows.
- ❌ No Inter/Roboto/system-ui as the identity font (Inter may be the body face; Fraunces is the identity).
- ❌ No centered hero + two generic buttons + "Trusted by 10,000+" badge row.
- ❌ No equal-width 3-column feature cards with emoji icons.
- ❌ No Lorem ipsum — every string is final copy (see §8 for voice).
- ❌ No drop shadows on everything: prefer 1px ink borders + paper texture; shadow only on hover lift.
- ✅ Asymmetry, overlap, rotation (max 3°), generous whitespace, and one wink of personality per section.

## 4. Art Direction

### Palette
| Token | Hex | Use |
|---|---|---|
| paper | #F6F1E7 | page background |
| ink | #1A1F1B | text, borders |
| matcha/sage | #5B7B5A | primary brand, links |
| pine/sage-deep | #2F4A35 | footer, dark sections |
| persimmon/clay | #B8593E | CTAs, focus rings, accents |
| sage-mist | #DCE4D6 | tint blocks, hover fills |

### Typography
- Display: **Fraunces** (serif, soft apothecary feel) — headlines, section titles, prices in italic.
- Body/UI: **Inter** — clean gothic body face.
- Japanese accents: **Noto Serif JP** for small vertical text and kanji watermarks.
- Scale: hero 56–72px, section titles 32–40px, body 16–17px/1.7, prices use tabular figures.

### Texture & Motifs
- Paper grain: SVG `feTurbulence` noise overlay, opacity ≤ 0.05, fixed, pointer-events none.
- Ensō (brush circle) SVG behind one hero word.
- Faint seigaiha wave pattern (SVG) in footer only, ~4% opacity.
- Hand-drawn wobbly underline (SVG path) animates on nav link hover.
- Hanko-style stamp badge ("本物保証 · Genuine") rotated -8°, used once in hero, once near checkout.
- Vertical Japanese side label on desktop hero: 健康、毎日。 ("health, every day").

### Imagery
- Real photography (Unsplash hotlinks in the catalogue, warm/low-saturation grade, consistent across cards).
- Each product has a kanji watermark behind/over its photo at ~10% opacity.
- **Fallback if a photo fails:** matcha gradient block + large kanji glyph (no broken images, ever).
- Images: lazy-loaded, explicit aspect-ratio boxes, `alt` text.

## 5. Page Sections & Behavior
(see PRD.md §4–§5 — the canonical list; this file adds the texture details)

## 6. Global Interactions & Micro-interactions
- **Reveal on scroll:** IntersectionObserver, fade-up 12px, 80ms stagger, once.
- **Toasts:** stack, max 3, auto-dismiss: "Vitamin C added — your cart is getting healthy."
- **Cart drawer:** slide-in, blurred backdrop, ESC + backdrop close. Inside: quantity steppers,
  remove with height-collapse animation, **free-delivery progress bar** ("GHS 60 away from free delivery" →
  "Free delivery unlocked" state change).
- **Search + filters combine** (AND logic); empty state: "Nothing here — try 'vitamin'."
- **Sticky mobile bar** after scrolling past hero: cart total + view-cart button.
- **Buttons:** press scale 0.97, 150ms ease-out. **Links:** underline draw-in.

## 7. Accessibility & Performance
- Semantic landmarks, one h1, logical heading order.
- Visible focus ring: 2px clay, 2px offset — never removed.
- Tap targets ≥ 44px; `prefers-reduced-motion` disables marquee, parallax, reveals.
- No horizontal scroll at 360px viewport.

## 8. Copy Voice
Calm, warm, human. Short sentences. Contractions. Health-literate but never preachy.
One light wink per section max. Examples:
- Empty cart: "Your cart is feeling light. Zen light."
- Free delivery unlocked: "Free delivery, unlocked. Your wallet thanks you."
- Quiz result style playfulness may appear in the nurse chat quick-replies.

## 9. Acceptance Criteria
- [ ] Reload keeps cart (localStorage).
- [ ] Filters + search work together; quick-view modal works from every card.
- [ ] Fly-to-cart, toasts, progress bar, drawer all function; ESC closes drawer/modal.
- [ ] No emoji used as UI icons anywhere in the chrome.
- [ ] 360px / 768px / 1440px all render cleanly; reduced-motion honored.
