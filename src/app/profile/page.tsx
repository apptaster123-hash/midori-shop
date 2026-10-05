"use client";

// /profile — the shopper's own page: who they are, and every order placed
// with their email. Guests get a quiet sign-in prompt, not a wall.
import { useEffect, useState } from "react";
import Link from "next/link";
import { SessionProvider, useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { fmtGhs } from "@/lib/products";
import { MidoriToaster } from "@/components/midori/midori-shop";
import { SignInDialog } from "@/components/midori/sign-in-dialog";

interface OrderItemView {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderView {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  subtotal: number;
  delivery: number;
  total: number;
  items: OrderItemView[];
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  whatsapp: "WhatsApp confirm",
};

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProfilePage() {
  // Own SessionProvider (same pattern as /checkout) — this route is reached
  // directly, outside the home page's composition root.
  return (
    <SessionProvider>
      <MidoriToaster />
      <ProfileInner />
    </SessionProvider>
  );
}

function ProfileInner() {
  const { data: session, status } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const user = session?.user ?? null;

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setOrders(null);
    setLoadError(false);
    fetch("/api/orders", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ ok: boolean; orders: OrderView[] }>) : null))
      .then((json) => {
        if (cancelled) return;
        setOrders(json && json.ok ? json.orders : []);
        if (!json || !json.ok) setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([]);
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const name = user?.name ?? "";
  const email = user?.email ?? "";
  const avatarUrl = user?.image ?? null;

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-10 lg:pt-14">
      <div className="mb-10">
        <Link
          href="/"
          className="text-small text-ink-mute transition-colors duration-200 hover:text-sage"
        >
          {"\u2190"} Back to the shop
        </Link>
        <h1 className="mt-3 text-h2">Your profile</h1>
      </div>

      {status === "loading" && (
        <p className="mt-16 text-center text-small text-ink-mute">Opening your profile…</p>
      )}

      {status === "unauthenticated" && (
        <section className="rounded-card border border-line bg-paper-soft p-10 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-mist font-japanese text-[1.5rem] text-sage-deep"
          >
            緑
          </span>
          <h2 className="mt-5 font-display text-[1.35rem] text-ink">You&rsquo;re browsing as a guest</h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-ink-soft">
            Sign in with your name and email — no password — and every order you place is kept
            together here. You can still check out as a guest whenever you like.
          </p>
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="mt-7 rounded-full bg-sage px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep"
          >
            Sign in
          </button>
        </section>
      )}

      {status === "authenticated" && user && (
        <>
          <section className="flex flex-col items-center gap-5 rounded-card border border-line bg-paper-soft p-8 text-center sm:flex-row sm:text-left">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sage-mist font-display text-[1.25rem] text-sage-deep"
              >
                {initialsOf(name) || "緑"}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-[1.35rem] text-ink">{name || "Signed in"}</h2>
              <p className="mt-1 truncate text-[0.95rem] text-ink-soft">{email}</p>
              <p className="mt-2 text-small text-ink-mute">
                Orders placed with this email appear below ·{" "}
                <Link href="/settings" className="underline-wobble text-sage">
                  Settings
                </Link>
              </p>
            </div>
          </section>

          <section aria-labelledby="midori-orders-heading" className="mt-10">
            <h2 id="midori-orders-heading" className="font-display text-[1.35rem] text-ink">
              Your orders
            </h2>

            {orders === null && (
              <p className="mt-4 text-small text-ink-mute">Fetching your orders…</p>
            )}

            {orders !== null && loadError && (
              <p className="mt-4 text-small text-clay">
                We couldn&rsquo;t load your orders just now — try refreshing in a moment.
              </p>
            )}

            {orders !== null && !loadError && orders.length === 0 && (
              <div className="mt-4 rounded-card border border-line bg-paper-soft p-8 text-center">
                <p className="font-display text-[1.2rem] italic">No orders yet.</p>
                <p className="mt-2 text-small text-ink-mute">
                  The shelf is short and everything on it is nurse-checked.
                </p>
                <Link href="/#shop" className="underline-wobble mt-5 inline-block font-medium text-sage">
                  Browse the shelf
                </Link>
              </div>
            )}

            {orders !== null && !loadError && orders.length > 0 && (
              <ul className="mt-4 space-y-4">
                {orders.map((order) => (
                  <li key={order.orderNumber} className="rounded-card border border-line bg-paper-soft p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="font-medium tabular text-ink">{order.orderNumber}</p>
                      <p className="text-small text-ink-mute">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {order.items.map((item) => (
                        <li key={`${order.orderNumber}-${item.name}`} className="flex justify-between gap-4 text-[0.95rem]">
                          <span className="text-ink-soft">
                            {item.quantity} × {item.name}
                          </span>
                          <span className="tabular text-ink">{fmtGhs(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line pt-3">
                      <span className="text-small text-ink-mute">
                        {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} ·{" "}
                        {order.delivery === 0 ? "Free delivery" : `Delivery ${fmtGhs(order.delivery)}`}
                      </span>
                      <span className="font-semibold tabular text-sage-deep">{fmtGhs(order.total)}</span>
                    </div>
                    <div className="mt-3">
                      <a
                        href={`https://wa.me/233551632777?text=${encodeURIComponent(
                          `Hello Nurse Elizabeth! I have a question about my order ${order.orderNumber}.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-small font-medium text-sage transition-colors duration-200 hover:text-sage-deep"
                      >
                        <MessageCircle size={14} strokeWidth={1.5} aria-hidden="true" />
                        Ask about this order
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}
