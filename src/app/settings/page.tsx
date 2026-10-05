"use client";

// /settings — local shopper preferences (name, WhatsApp phone, default city)
// used to prefill checkout, plus account sign-out. Saved on this device only;
// the page says so plainly.
import { useEffect, useState } from "react";
import Link from "next/link";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ShopperSettings } from "@/lib/settings";
import { MidoriToaster } from "@/components/midori/midori-shop";
import { SignInDialog } from "@/components/midori/sign-in-dialog";

export default function SettingsPage() {
  // Own SessionProvider (same pattern as /checkout) — this route is reached
  // directly, outside the home page's composition root. MidoriToaster covers
  // the "Settings cleared" toast.
  return (
    <SessionProvider>
      <MidoriToaster />
      <SettingsInner />
    </SessionProvider>
  );
}

function SettingsInner() {
  const { data: session, status } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const [settings, setSettings] = useState<ShopperSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  // Once signed in, seed the name field from the session if the shopper
  // hasn't set their own yet.
  useEffect(() => {
    if (status === "authenticated" && mounted) {
      setSettings((current) =>
        current.name === "" && session?.user?.name ? { ...current, name: session.user.name } : current,
      );
    }
  }, [status, mounted, session]);

  const update = (patch: Partial<ShopperSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const inputClasses =
    "mt-1.5 w-full rounded-input border border-line bg-paper-soft px-3 py-2.5 text-[0.95rem] text-ink transition-colors duration-200 placeholder:text-ink-mute focus:border-sage";

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-10 lg:pt-14">
      <div className="mb-10">
        <Link
          href="/"
          className="text-small text-ink-mute transition-colors duration-200 hover:text-sage"
        >
          {"\u2190"} Back to the shop
        </Link>
        <h1 className="mt-3 text-h2">Settings</h1>
        <p className="mt-1 text-small text-ink-mute">
          Small conveniences, kept on this device — checkout fills itself in from here.
        </p>
      </div>

      <section aria-labelledby="midori-checkout-settings" className="rounded-card border border-line bg-paper-soft p-8">
        <h2 id="midori-checkout-settings" className="font-display text-[1.35rem] text-ink">
          Checkout details
        </h2>
        <p className="mt-1 text-small text-ink-mute">
          Saved on this device. Your cart never leaves this browser either.
        </p>

        <div className="mt-6 max-w-[520px] space-y-5">
          <label className="block">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
              Full name at checkout
            </span>
            <input
              type="text"
              value={mounted ? settings.name : ""}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="e.g. Elizabeth David"
              autoComplete="name"
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
              WhatsApp number
            </span>
            <input
              type="tel"
              value={mounted ? settings.phone : ""}
              onChange={(event) => update({ phone: event.target.value })}
              placeholder="e.g. 055 000 0000"
              autoComplete="tel"
              className={inputClasses}
            />
            <span className="mt-1 block text-small text-ink-mute">
              Used to prefill checkout — the nurse confirms delivery on WhatsApp.
            </span>
          </label>

          <label className="block">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
              Default delivery city
            </span>
            <input
              type="text"
              value={mounted ? settings.city : ""}
              onChange={(event) => update({ city: event.target.value })}
              placeholder="Accra"
              autoComplete="address-level2"
              className={inputClasses}
            />
          </label>
        </div>
      </section>

      <section aria-labelledby="midori-account-settings" className="mt-6 rounded-card border border-line bg-paper-soft p-8">
        <h2 id="midori-account-settings" className="font-display text-[1.35rem] text-ink">
          Account
        </h2>
        {status === "loading" && <p className="mt-3 text-small text-ink-mute">Checking your session…</p>}
        {status === "unauthenticated" && (
          <div className="mt-3">
            <p className="text-ink-soft">
              You&rsquo;re browsing as a guest. Sign in to keep your orders together.
            </p>
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="mt-4 rounded-full bg-sage px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep"
            >
              Sign in
            </button>
          </div>
        )}
        {status === "authenticated" && session.user && (
          <div className="mt-3">
            <p className="text-ink-soft">
              Signed in as <span className="font-medium text-ink">{session.user.email ?? session.user.name}</span>.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/profile"
                className="rounded-full border border-line px-6 py-3 text-[0.95rem] font-medium text-ink transition-colors duration-200 hover:border-sage hover:text-sage"
              >
                View your profile
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-full px-6 py-3 text-[0.95rem] font-medium text-clay transition-colors duration-200 hover:text-clay/80"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-small text-ink-mute">
        Preferences save as you type.{" "}
        <button
          type="button"
          onClick={() => {
            saveSettings(DEFAULT_SETTINGS);
            setSettings(DEFAULT_SETTINGS);
            toast("Settings cleared");
          }}
          className="underline-wobble text-ink-mute transition-colors duration-200 hover:text-clay"
        >
          Clear them
        </button>
      </p>

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}
