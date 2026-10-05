"use client";

// Checkout page — PRD §5.11. Form (left ~3/5) + order summary (right ~2/5,
// paper-soft; on top when collapsed to one column on mobile). States:
// form → submitting → done, with an inline error banner on failure.
// Prices are display-only here; the server recomputes them from the DB.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SessionProvider, useSession } from "next-auth/react";
import { Banknote, Check, LoaderCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { deliveryFor, fmtGhs } from "@/lib/products";
import { loadSettings } from "@/lib/settings";
import { useStore } from "@/lib/store";
import { MidoriToaster } from "@/components/midori/midori-shop";
import {
  ProductThumb,
  useProductIndex,
} from "@/components/midori/cart-drawer";

const WHATSAPP_URL = "https://wa.me/233551632777";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type PaymentMethod = "cod" | "whatsapp";

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

type TextKey = "name" | "email" | "phone" | "address" | "city" | "notes";

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "address" | "city", string>>;

type PlacedOrder = {
  orderNumber: string;
  subtotal: number;
  delivery: number;
  total: number;
  email: string;
  firstName: string;
  paymentMethod: PaymentMethod;
};

function validateForm(form: CheckoutForm): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length === 0) errors.name = "Please tell us your full name.";
  if (!EMAIL_RE.test(form.email.trim()))
    errors.email = "That email doesn't look complete — we send your confirmation here.";
  if (form.phone.trim().length < 8)
    errors.phone = "A phone number of at least 8 characters helps the courier reach you.";
  if (form.address.trim().length === 0) errors.address = "Where should we deliver?";
  if (form.city.trim().length === 0) errors.city = "Which city are we delivering to?";
  return errors;
}

function isCheckoutSuccess(
  value: unknown,
): value is { ok: true; orderNumber: string; subtotal: number; delivery: number; total: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.ok === true &&
    typeof record.orderNumber === "string" &&
    typeof record.subtotal === "number" &&
    typeof record.delivery === "number" &&
    typeof record.total === "number"
  );
}

function isCheckoutFailure(value: unknown): value is { ok: false; error: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.ok === false && typeof record.error === "string";
}

export default function CheckoutPage() {
  // The composition root's SessionProvider wraps the home page; /checkout is
  // reached directly, so provide its own session context here (nesting is safe).
  // MidoriToaster covers the order-success toast on this route — the home
  // page's mount never renders at the same time as this one.
  return (
    <SessionProvider>
      <MidoriToaster />
      <CheckoutInner />
    </SessionProvider>
  );
}

function CheckoutInner() {
  const cart = useStore((s) => s.cart);
  const clearCart = useStore((s) => s.clearCart);
  const { products, ready } = useProductIndex();
  const { data: session } = useSession();

  // Persisted-store reads stay behind a mounted flag — the server render and
  // the first client render agree, so there is no hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "Accra",
    notes: "",
    paymentMethod: "cod",
  });
  const [touched, setTouched] = useState<Partial<Record<TextKey, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  // Prefill from the session and from /settings (this device) once available,
  // without overwriting anything the visitor already typed.
  useEffect(() => {
    const sessionName = session?.user?.name ?? "";
    const sessionEmail = session?.user?.email ?? "";
    const local = loadSettings();
    const prefs = {
      name: sessionName || local.name,
      email: sessionEmail,
      phone: local.phone,
      city: local.city,
    };
    setForm((prev) => ({
      ...prev,
      name: prev.name || prefs.name,
      email: prev.email || prefs.email,
      phone: prev.phone || prefs.phone,
      city: prefs.city || prev.city,
    }));
  }, [session, mounted]);

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p] as const)),
    [products],
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

  const fieldErrors = useMemo(() => validateForm(form), [form]);
  const formValid = Object.keys(fieldErrors).length === 0 && lines.length > 0;

  const setField = (key: TextKey) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const touchField = (key: TextKey) => () =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const showError = (key: keyof FieldErrors) =>
    Boolean((touched[key] || attempted) && fieldErrors[key]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    setServerError(null);
    if (Object.keys(fieldErrors).length > 0 || lines.length === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            paymentMethod: form.paymentMethod,
            ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
          },
          items: lines.map(({ line }) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        }),
      });
      const json: unknown = await response.json().catch(() => null);

      if (response.ok && isCheckoutSuccess(json)) {
        const firstName = form.name.trim().split(/\s+/)[0] || "friend";
        setPlaced({
          orderNumber: json.orderNumber,
          subtotal: json.subtotal,
          delivery: json.delivery,
          total: json.total,
          email: form.email.trim(),
          firstName,
          paymentMethod: form.paymentMethod,
        });
        clearCart();
        toast.success(
          `Order ${json.orderNumber} confirmed — confirmation sent to ${form.email.trim()}`,
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(
          isCheckoutFailure(json)
            ? json.error
            : "Something went wrong while placing your order. Please try again.",
        );
      }
    } catch {
      setServerError(
        "We couldn't reach the shop just now. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-[1080px] px-6 py-24">
        <p className="text-small text-ink-mute">Opening your cart…</p>
      </main>
    );
  }

  if (placed) {
    const whatsappLink = `${WHATSAPP_URL}?text=${encodeURIComponent(
      `Hello Midori! I just placed order ${placed.orderNumber}.`,
    )}`;
    const paymentNote =
      placed.paymentMethod === "cod"
        ? "Cash on delivery — pay the courier when your parcel arrives."
        : "WhatsApp confirm — we'll message you on +233 55 163 2777 to confirm the details.";
    return (
      <main className="mx-auto w-full max-w-[640px] px-6 py-20 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-mist"
        >
          <Check size={28} strokeWidth={1.5} className="text-sage-deep" />
        </span>
        <h1 className="mt-6 text-h2">Thank you, {placed.firstName}.</h1>
        <p className="mt-2 text-ink-soft">
          Your order is in. Everything is sealed and nurse-checked before it
          leaves the shop.
        </p>
        <div className="mt-8 rounded-card border border-line bg-paper-soft px-6 py-5 text-left">
          <p className="text-small text-ink-mute">Order number</p>
          <p className="tabular mt-1 font-semibold tracking-wide">{placed.orderNumber}</p>
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-small">
            <div className="flex items-baseline justify-between text-ink-soft">
              <dt>Subtotal</dt>
              <dd className="tabular font-medium">{fmtGhs(placed.subtotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between text-ink-soft">
              <dt>Delivery</dt>
              <dd className="tabular font-medium">
                {placed.delivery === 0 ? (
                  <span className="text-sage">Free</span>
                ) : (
                  fmtGhs(placed.delivery)
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt>Total</dt>
              <dd className="text-price tabular font-semibold">{fmtGhs(placed.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-line pt-4 text-small text-ink-soft">
            {paymentNote}
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage-deep px-6 py-3 font-medium text-paper transition-colors duration-200 hover:bg-sage sm:w-auto"
          >
            <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
            Continue on WhatsApp
          </a>
          <Link href="/" className="underline-wobble font-medium text-sage">
            Keep browsing
          </Link>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[640px] px-6 py-24 text-center">
        <h1 className="text-h2">Checkout</h1>
        <p className="mt-4 font-display text-[1.35rem] italic leading-snug">
          Your cart is feeling light. Zen light.
        </p>
        <p className="mt-2 text-small text-ink-mute">
          Nothing to check out just yet — the shop is a short scroll away.
        </p>
        <Link
          href="/#shop"
          className="underline-wobble mt-6 inline-block font-medium text-sage"
        >
          Back to the shop
        </Link>
      </main>
    );
  }

  if (!ready || lines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[640px] px-6 py-24 text-center">
        <h1 className="text-h2">Checkout</h1>
        {ready ? (
          <>
            <p className="mt-4 text-ink-soft">
              We couldn&apos;t load the items saved in your cart — they may have
              changed since your last visit.
            </p>
            <Link
              href="/#shop"
              className="underline-wobble mt-6 inline-block font-medium text-sage"
            >
              Back to the shop
            </Link>
          </>
        ) : (
          <p className="mt-4 text-small text-ink-mute">Opening your cart…</p>
        )}
      </main>
    );
  }

  const inputClasses = (hasError: boolean) =>
    `mt-1.5 w-full rounded-input border bg-paper-soft px-3 py-2.5 text-[0.95rem] text-ink transition-colors duration-200 placeholder:text-ink-mute ${
      hasError ? "border-clay" : "border-line"
    }`;

  return (
    <main className="mx-auto w-full max-w-[1080px] px-6 pb-24 pt-10 lg:pt-14">
      <div className="mb-10">
        <Link
          href="/"
          className="text-small text-ink-mute transition-colors duration-200 hover:text-sage"
        >
          {"\u2190"} Back to the shop
        </Link>
        <h1 className="mt-3 text-h2">Checkout</h1>
        <p className="mt-1 text-small text-ink-mute">
          Free delivery in Accra over GHS 200 · Sealed &amp; nurse-checked before
          dispatch
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-8 rounded-card border border-clay/50 bg-clay/10 px-4 py-3 text-small text-ink"
        >
          {serverError}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
        {/* Order summary — first on mobile, right column on desktop */}
        <section aria-labelledby="summary-heading" className="order-1 lg:order-2">
          <h2 id="summary-heading" className="font-display text-[1.25rem]">
            Order summary
          </h2>
          <div className="mt-4 rounded-card border border-line bg-paper-soft p-5">
            <ul className="space-y-4">
              {lines.map(({ line, product }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <ProductThumb product={product} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.95rem] font-medium">{product.name}</p>
                    <p className="tabular text-small text-ink-mute">
                      {line.quantity} {"\u00d7"} {fmtGhs(product.price)}
                    </p>
                  </div>
                  <span className="tabular text-small font-semibold">
                    {fmtGhs(product.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1 border-t border-line pt-4 text-small">
              <div className="flex items-baseline justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="tabular font-medium">{fmtGhs(subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between text-ink-soft">
                <dt>Delivery</dt>
                <dd className="tabular font-medium">
                  {delivery === 0 ? (
                    <span className="text-sage">Free</span>
                  ) : (
                    fmtGhs(delivery)
                  )}
                </dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <dt>Total</dt>
                <dd className="text-price tabular font-semibold">{fmtGhs(total)}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Details form */}
        <section className="order-2 lg:order-1">
          <form onSubmit={onSubmit} noValidate>
            <fieldset disabled={submitting} className="m-0 space-y-5 border-0 p-0">
              <div>
                <label htmlFor="co-name" className="block text-small font-medium text-ink-soft">
                  Full name
                </label>
                <input
                  id="co-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={setField("name")}
                  onBlur={touchField("name")}
                  aria-invalid={showError("name") || undefined}
                  aria-describedby={showError("name") ? "co-name-error" : undefined}
                  className={inputClasses(showError("name"))}
                />
                {showError("name") && (
                  <p id="co-name-error" className="mt-1.5 text-small text-clay">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-email" className="block text-small font-medium text-ink-soft">
                  Email
                </label>
                <input
                  id="co-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={setField("email")}
                  onBlur={touchField("email")}
                  aria-invalid={showError("email") || undefined}
                  aria-describedby={showError("email") ? "co-email-error" : "co-email-hint"}
                  className={inputClasses(showError("email"))}
                />
                {showError("email") ? (
                  <p id="co-email-error" className="mt-1.5 text-small text-clay">
                    {fieldErrors.email}
                  </p>
                ) : (
                  <p id="co-email-hint" className="mt-1.5 text-small text-ink-mute">
                    We&apos;ll send your order confirmation here.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-phone" className="block text-small font-medium text-ink-soft">
                  Phone (WhatsApp preferred)
                </label>
                <input
                  id="co-phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={setField("phone")}
                  onBlur={touchField("phone")}
                  aria-invalid={showError("phone") || undefined}
                  aria-describedby={showError("phone") ? "co-phone-error" : undefined}
                  className={inputClasses(showError("phone"))}
                />
                {showError("phone") && (
                  <p id="co-phone-error" className="mt-1.5 text-small text-clay">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-address" className="block text-small font-medium text-ink-soft">
                  Delivery address
                </label>
                <input
                  id="co-address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={setField("address")}
                  onBlur={touchField("address")}
                  aria-invalid={showError("address") || undefined}
                  aria-describedby={showError("address") ? "co-address-error" : undefined}
                  className={inputClasses(showError("address"))}
                />
                {showError("address") && (
                  <p id="co-address-error" className="mt-1.5 text-small text-clay">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-city" className="block text-small font-medium text-ink-soft">
                  City
                </label>
                <input
                  id="co-city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={setField("city")}
                  onBlur={touchField("city")}
                  aria-invalid={showError("city") || undefined}
                  aria-describedby={showError("city") ? "co-city-error" : undefined}
                  className={inputClasses(showError("city"))}
                />
                {showError("city") && (
                  <p id="co-city-error" className="mt-1.5 text-small text-clay">
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              <fieldset disabled={submitting} className="m-0 border-0 p-0">
                <legend className="text-small font-medium text-ink-soft">Payment method</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors duration-200 ${
                      form.paymentMethod === "cod"
                        ? "border-sage bg-sage-mist/40"
                        : "border-line hover:border-ink-soft/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={form.paymentMethod === "cod"}
                      onChange={() => setForm((prev) => ({ ...prev, paymentMethod: "cod" }))}
                      className="mt-1 accent-sage"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[0.95rem] font-medium">
                        <Banknote size={16} strokeWidth={1.5} aria-hidden="true" />
                        Cash on delivery
                      </span>
                      <span className="mt-0.5 block text-small text-ink-mute">
                        Pay courier on arrival
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors duration-200 ${
                      form.paymentMethod === "whatsapp"
                        ? "border-sage bg-sage-mist/40"
                        : "border-line hover:border-ink-soft/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="whatsapp"
                      checked={form.paymentMethod === "whatsapp"}
                      onChange={() => setForm((prev) => ({ ...prev, paymentMethod: "whatsapp" }))}
                      className="mt-1 accent-sage"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[0.95rem] font-medium">
                        <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                        WhatsApp confirm
                      </span>
                      <span className="mt-0.5 block text-small text-ink-mute">
                        We&apos;ll confirm details
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              <div>
                <label htmlFor="co-notes" className="block text-small font-medium text-ink-soft">
                  Notes (optional)
                </label>
                <textarea
                  id="co-notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={setField("notes")}
                  placeholder="Delivery instructions, gate codes, etc."
                  className={`${inputClasses(false)} resize-y`}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!formValid || submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3 font-medium text-paper transition-[background-color,transform] duration-200 hover:bg-clay/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoaderCircle size={16} strokeWidth={1.5} aria-hidden="true" className="animate-spin" />
                  Placing your order…
                </>
              ) : (
                <span className="tabular">Place order — {fmtGhs(total)}</span>
              )}
            </button>
            {submitting && (
              <p className="mt-3 text-center text-small text-ink-mute">
                Writing your order and sending your confirmation email…
              </p>
            )}
            {!formValid && Object.keys(touched).length > 0 && (
              <p className="mt-3 text-center text-small text-ink-mute">
                Complete the highlighted fields to place your order.
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
