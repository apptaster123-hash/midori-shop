// Midori page sections — PRD §5.1 (ribbon), §5.4 (hero), §5.5 (editorial intro),
// §5.6 (featured), §5.13 (testimonials), §5.14 (about), §5.15 (contact), §5.16 (footer).
// Sections take products as props typed with Product from "@/lib/products"; the
// assembler passes them. All interactivity runs through the zustand store.
// Every <img> falls back to a matcha-tinted kanji plate on error — never broken.
"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Phone, X } from "lucide-react";
import { fmtGhs, kanjiPlate, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { Reveal } from "./reveal";

const RIBBON_KEY = "midori-ribbon-dismissed";
const WHATSAPP_URL = "https://wa.me/233551632777";
const SHOP_EMAIL = "takumistudio26@gmail.com";

/* ------------------------------------------------------------------ */
/*  Shared photo with intentional kanji fallback (§5.7 image fallback) */
/* ------------------------------------------------------------------ */

type ProductImageProps = {
  product: Product;
  alt: string;
  /** Kanji watermark over the photo at ~10% (ui-spec §4 imagery). */
  watermark?: boolean;
  className?: string;
};

function ProductImage({ product, alt, watermark = false, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!product.image || failed) {
    // Tinted kanji plate — reads as intentional, never broken.
    return (
      <div
        role="img"
        aria-label={alt}
        className={`kanji-plate-${kanjiPlate(product)} flex h-full w-full items-center justify-center rounded-photo ${className ?? ""}`}
      >
        <span aria-hidden="true" className="select-none font-japanese text-[4.5rem] leading-none text-sage-deep/35">
          {product.kanji}
        </span>
      </div>
    );
  }

  return (
    <>
      <img
        src={product.image}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className ?? ""}`}
      />
      {watermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-3 select-none font-japanese text-[3.5rem] leading-none text-paper opacity-20"
        >
          {product.kanji}
        </span>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.1 Top ribbon — dismissible for the session, animates out        */
/* ------------------------------------------------------------------ */

export function Ribbon() {
  const [hidden, setHidden] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(RIBBON_KEY) === "1") setHidden(true);
    } catch {
      // Session storage unavailable (private mode) — the ribbon simply shows.
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    try {
      window.sessionStorage.setItem(RIBBON_KEY, "1");
    } catch {
      // Ignore — dismissal just won't survive the session.
    }
    window.setTimeout(() => setHidden(true), 320);
  };

  if (hidden) return null;

  return (
    <div
      className={`overflow-hidden bg-sage-deep transition-all duration-300 ease-calm ${
        closing ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
      }`}
    >
      <div className="relative mx-auto flex max-w-[1280px] items-center justify-center py-3.5 px-12">
        <p className="text-center text-[13px] leading-snug text-paper">
          Sealed &amp; nurse-checked · Free delivery in Accra over GHS 200
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-paper/70 transition-colors duration-200 hover:text-paper"
        >
          <X size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.4 Hero — asymmetric 7/5, enso behind "Midori", tategaki          */
/* ------------------------------------------------------------------ */

export function Hero({ product }: { product: Product }) {
  const openChat = useStore((s) => s.openChat);

  return (
    <section
      aria-labelledby="midori-hero-heading"
      className="bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-7">
          <div className="max-w-[640px]">
            <h1 id="midori-hero-heading" className="text-ink">
              Wellness, the{" "}
              <span className="relative inline-block whitespace-nowrap">
                {/* Ensō — one open brush circle, drawn quietly behind "Midori" */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  fill="none"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[1.5em] w-[1.5em] -translate-x-1/2 -translate-y-1/2 text-sage opacity-40"
                >
                  <path
                    d="M 59.3 15.2 A 36 36 0 1 0 84.8 40.7"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="relative">Midori</span>
              </span>{" "}
              way.
            </h1>
            <p className="mt-6 max-w-[54ch] text-ink-soft">
              Midori (<span className="font-japanese">緑</span>) means green — the colour of slow,
              steady growth. It&rsquo;s how Elizabeth David, RN, thinks a medicine cabinet should
              feel: sealed, genuine, and checked by the nurse who signs her work.
            </p>
            <p className="mt-4 text-small uppercase tracking-[0.18em] text-sage">
              Kept by Elizabeth David, RN · Founder
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <a
                href="#shop"
                className="rounded-full bg-sage px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep"
              >
                Shop wellness
              </a>
              <button
                type="button"
                onClick={() => openChat()}
                className="underline-wobble text-[0.95rem] font-medium text-ink transition-colors duration-200 hover:text-sage"
              >
                Ask the nurse →
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="lg:col-span-5">
          <div className="flex gap-5">
            <span aria-hidden="true" className="tategaki hidden self-start text-[1rem] text-sage-deep sm:block">
              健康・毎日・安心
            </span>
            <div className="img-zoom aspect-[4/5] w-full rounded-photo bg-sage-mist">
              <ProductImage
                product={product}
                alt={`${product.name} — hand-checked and chosen by nurse Elizabeth David for the Midori shelf, Accra`}
              />
            </div>
          </div>
          <p className="mt-3 text-small text-ink-mute">
            Every parcel hand-checked by Elizabeth David, RN · Accra
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.5 Editorial intro — one signed paragraph, 680px, centered       */
/* ------------------------------------------------------------------ */

export function EditorialIntro() {
  return (
    <section className="bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]">
      <Reveal className="mx-auto max-w-[680px] text-center">
        <p className="text-body text-ink-soft">
          I started Midori after eleven years on hospital wards, where I kept meeting people who had
          paid real money for expired or fake supplements. So now I open every parcel myself: factory
          seal, batch number, expiry date — checked before anything is wrapped, and packed the way
          I&rsquo;d hand it to my own mother. Order before 2pm in Accra and it leaves my studio the
          same day; after that, first thing tomorrow. If you&rsquo;re not sure what to pick, message
          me — I&rsquo;ll tell you what I&rsquo;d actually take, not what pays best.
        </p>
        <p className="mt-7 font-display text-[1.2rem] italic text-ink">Elizabeth David, RN · Founder</p>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.6 Featured — 1 large + 2 stacked, magazine spread               */
/* ------------------------------------------------------------------ */

function FeaturedCard({
  product,
  aspect,
  delay = 0,
  className,
}: {
  product: Product;
  aspect: string;
  delay?: number;
  className?: string;
}) {
  const openQuickView = useStore((s) => s.openQuickView);

  return (
    <Reveal delay={delay} className={className}>
      <article className="group relative">
        <div className={`img-zoom relative ${aspect} rounded-photo bg-sage-mist`}>
          <ProductImage
            product={product}
            alt={`${product.name} — ${product.caption}`}
            watermark
            className="group-hover:scale-[1.04]"
          />
        </div>
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-sage">
            {product.categoryLabel}
          </p>
          <div className="mt-1.5 flex items-baseline justify-between gap-4">
            <h3 className="text-ink">{product.name}</h3>
            <p className="font-semibold tabular text-price text-ink">{fmtGhs(product.price)}</p>
          </div>
          <p className="mt-1 text-small text-ink-mute">{product.caption}</p>
        </div>
        <button
          type="button"
          onClick={() => openQuickView(product.id)}
          className="absolute inset-0 rounded-card"
          aria-label={`Quick view — ${product.name}, ${fmtGhs(product.price)}`}
        />
      </article>
    </Reveal>
  );
}

export function Featured({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [lead, ...rest] = products;
  const stacked = rest.slice(0, 2);

  return (
    <section
      aria-labelledby="midori-featured-heading"
      className="bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-small uppercase tracking-[0.18em] text-sage">Featured</p>
              <h2 id="midori-featured-heading" className="mt-3 text-ink">
                On my shelf this month
              </h2>
            </div>
            <p className="max-w-[26ch] text-small text-ink-mute">
              Three things I&rsquo;d keep in my own cabinet — and do.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-12">
          <FeaturedCard product={lead} aspect="aspect-[4/3]" className="lg:col-span-7" />
          {stacked.length > 0 && (
            <div className="flex flex-col gap-10 lg:col-span-5">
              {stacked.map((product, index) => (
                <FeaturedCard
                  key={product.id}
                  product={product}
                  aspect="aspect-[16/10]"
                  delay={80 * (index + 1)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.14 About — narrow column, the nurse's voice                     */
/* ------------------------------------------------------------------ */

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="midori-about-heading"
      className="bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <Reveal className="mx-auto max-w-[680px]">
        <h2
          id="midori-about-heading"
          className="text-small font-normal uppercase tracking-[0.18em] text-sage"
        >
          01 — Why Midori exists
        </h2>
        <div className="mt-7 space-y-5 text-ink-soft">
          <p>
            I&rsquo;m Elizabeth — a registered nurse who got tired of seeing people buy wellness
            products from places that don&rsquo;t care what&rsquo;s actually in the box.
          </p>
          <p>
            So I opened Midori. Every product on this shelf is one I&rsquo;d recommend to a patient
            or a family member. I check seals, I check expiry dates, I check that the brand is the
            real brand.
          </p>
          <p>
            You can WhatsApp me before you buy, ask me anything, and I&rsquo;ll give you a straight
            answer. No upselling. No pressure. Just the stuff that works.
          </p>
        </div>
        <p className="mt-9 font-display text-[1.2rem] italic text-ink">— Elizabeth, RN</p>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.13 Testimonials — three real stories that sit still             */
/* ------------------------------------------------------------------ */

const TESTIMONIALS = [
  {
    quote:
      "My mum's readings used to be a guess. Nurse Elizabeth walked me through the monitor on WhatsApp before I paid — now we check every Sunday and I actually understand the numbers.",
    name: "Akosua Mensah",
    place: "East Legon, Accra",
    item: "Blood Pressure Monitor",
  },
  {
    quote:
      "The tablets arrived sealed, expiry two years out, with a note in the box. Small thing — but I've been burned before. This is the one online shop in Accra I don't double-check.",
    name: "Kwame Boateng",
    place: "Osu, Accra",
    item: "Vitamin C 1000mg",
  },
  {
    quote:
      "My daughter's skin reacted to everything until this lotion. Elizabeth asked her age and skin history before recommending it. Who does that anymore?",
    name: "Efua Danso",
    place: "Dansoman, Accra",
    item: "Baby Lotion 200ml",
  },
] as const;

const TESTIMONIAL_OFFSETS = ["lg:mt-0", "lg:mt-8", "lg:mt-16"] as const;

export function Testimonials() {
  return (
    <section
      id="reviews"
      aria-labelledby="midori-reviews-heading"
      className="bg-paper px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <p className="text-small uppercase tracking-[0.18em] text-sage">Reviews</p>
          <h2 id="midori-reviews-heading" className="mt-3 text-ink">
            From the neighbourhood
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              delay={80 * index}
              className={`lg:col-span-4 ${TESTIMONIAL_OFFSETS[index]}`}
            >
              <figure className="flex h-full flex-col rounded-card border border-line bg-paper-soft p-6">
                <span
                  role="img"
                  aria-label="Rated five out of five stars"
                  className="tracking-[0.25em] text-clay"
                >
                  ★★★★★
                </span>
                <blockquote className="mt-4 flex-1 font-display text-[1.05rem] italic leading-relaxed text-ink">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-small text-ink-mute">
                  {testimonial.name} · {testimonial.place}
                  <br />
                  Bought the <span className="font-medium text-ink-soft">{testimonial.item}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.15 Contact — quiet, real links, no dark CTA banner              */
/* ------------------------------------------------------------------ */

export function Contact() {
  const openChat = useStore((s) => s.openChat);

  return (
    <section
      id="contact"
      aria-labelledby="midori-contact-heading"
      className="border-y border-line bg-paper-soft px-[clamp(24px,6vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <Reveal className="mx-auto max-w-[680px] text-center">
        <h2 id="midori-contact-heading" className="text-ink">
          Questions before you order?
        </h2>
        <p className="mt-3 text-ink-soft">
          Skip the forms. Ask the nurse the way you&rsquo;d ask a neighbour.
        </p>
        <ul className="mx-auto mt-10 flex max-w-[440px] flex-col gap-4">
          <li>
            <a
              href="tel:+233551632777"
              className="flex items-center justify-center gap-3 text-[1.05rem] text-ink transition-colors duration-200 hover:text-sage"
            >
              <Phone size={18} strokeWidth={1.5} aria-hidden="true" className="text-sage" />
              <span className="underline-wobble tabular">+233 55 163 2777</span>
              <span className="text-small text-ink-mute">· call the studio</span>
            </a>
          </li>
          <li>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 text-[1.05rem] text-ink transition-colors duration-200 hover:text-sage"
            >
              <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" className="text-sage" />
              <span className="underline-wobble">WhatsApp the nurse</span>
            </a>
          </li>
          <li>
            <a
              href={`mailto:${SHOP_EMAIL}`}
              className="flex items-center justify-center gap-3 text-[1.05rem] text-ink transition-colors duration-200 hover:text-sage"
            >
              <Mail size={18} strokeWidth={1.5} aria-hidden="true" className="text-sage" />
              <span className="underline-wobble">{SHOP_EMAIL}</span>
            </a>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => openChat()}
          className="mt-10 rounded-full bg-sage px-8 py-3.5 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep"
        >
          Talk to the nurse
        </button>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  §5.16 Footer — one quiet, signed line on sage-deep + seigaiha      */
/* ------------------------------------------------------------------ */

export function Footer() {
  return (
    <Reveal>
      <footer className="seigaiha bg-sage-deep text-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-[clamp(24px,6vw,80px)] py-8 text-[14px] min-[760px]:flex-row">
          <p className="text-paper/90">
            © 2025 Midori Health &amp; Wellness ·{" "}
            <span aria-hidden="true" className="font-japanese">
              緑
            </span>{" "}
            · Made in Accra
          </p>
          <a
            href={`mailto:${SHOP_EMAIL}`}
            className="text-paper/90 underline-offset-4 transition-colors duration-200 hover:text-paper hover:underline"
          >
            {SHOP_EMAIL}
          </a>
        </div>
      </footer>
    </Reveal>
  );
}
