// Midori sticky nav — PRD §5.2 (wordmark, anchors, search trigger, badges, hamburger)
// and §5.18 (sign-in area). Search trigger + Cmd/Ctrl+K + "/" wired here (§5.3).
// All open/close actions go through the zustand store — overlays live elsewhere.
"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Heart, Search, ShoppingCart, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "./logo";
import { SignInDialog } from "./sign-in-dialog";

const NAV_LINKS = [
  { label: "Shop", href: "#shop" },
  { label: "About", href: "#about" },
  { label: "Book a nurse", href: "#book" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
] as const;

const ICON_BUTTON =
  "relative flex h-11 w-11 items-center justify-center text-ink transition-colors duration-200 hover:text-sage";

export function Nav() {
  const { data: session, status } = useSession();
  const openSearch = useStore((s) => s.openSearch);
  const openCart = useStore((s) => s.openCart);
  const openWishlist = useStore((s) => s.openWishlist);
  const cartCount = useStore((s) => s.cart.reduce((n, line) => n + line.quantity, 0));
  const wishlistCount = useStore((s) => s.wishlist.length);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // §5.3 — Cmd/Ctrl+K anywhere; "/" only when not typing in a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
        return;
      }
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openSearch();
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  // §5.2 — subtle shadow once the page scrolls past 80vh.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // §5.18 — sign-in opens the in-app dialog (demo asks name + email; Google
  // takes over automatically once real credentials exist). Never the raw
  // NextAuth default page.
  const onSignIn = () => {
    setAccountOpen(false);
    setSignInOpen(true);
  };

  const onSignOut = () => {
    setAccountOpen(false);
    void signOut({ callbackUrl: "/" });
  };

  const user = session?.user;
  const avatarUrl = user?.image ?? null;

  // Counts come from persisted localStorage — render badges only after mount
  // so server HTML and first client render agree.
  const showCartBadge = mounted && cartCount > 0;
  const showWishlistBadge = mounted && wishlistCount > 0;

  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const badge = (show: boolean, count: number) =>
    show ? (
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-none tabular text-paper">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  // §5.18 — text-only sign-in; avatar (or initials) once authenticated, with
  // a small account menu (Profile / Settings / Sign out).
  const avatar = (sizeClass: string) =>
    avatarUrl && avatarUrl !== failedAvatarUrl ? (
      <img
        src={avatarUrl}
        alt=""
        width={28}
        height={28}
        onError={() => setFailedAvatarUrl(avatarUrl)}
        className={`${sizeClass} rounded-full border border-line object-cover`}
      />
    ) : (
      <span
        aria-hidden="true"
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-sage-mist text-[0.6875rem] font-semibold text-sage-deep`}
      >
        {initials || <span className="font-japanese text-[0.8rem] leading-none">緑</span>}
      </span>
    );

  const authArea = (fullWidth: boolean) => {
    if (status === "loading") {
      return (
        <span
          aria-hidden="true"
          className={
            fullWidth
              ? "block h-9"
              : "hidden h-8 w-14 min-[760px]:block"
          }
        />
      );
    }
    if (user) {
      if (fullWidth) {
        // Mobile panel — plain links, thumb-sized.
        return (
          <div className="flex flex-col gap-2">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-input border border-line px-4 py-3 text-[0.95rem] font-medium text-ink transition-colors duration-200 hover:text-sage"
            >
              {avatar("h-7 w-7")}
              Your profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-input border border-line px-4 py-3 text-[0.95rem] font-medium text-ink transition-colors duration-200 hover:text-sage"
            >
              <UserRound size={18} strokeWidth={1.5} aria-hidden="true" className="text-ink-mute" />
              Settings
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-input px-4 py-3 text-left text-[0.95rem] font-medium text-clay transition-colors duration-200 hover:text-clay/80"
            >
              Sign out
            </button>
          </div>
        );
      }
      return (
        <div className="relative hidden min-[760px]:block">
          {accountOpen && (
            <button
              type="button"
              aria-label="Close account menu"
              onClick={() => setAccountOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
          )}
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Your account"
            className="flex h-11 items-center gap-2 px-1.5 transition-colors duration-200 hover:text-sage"
          >
            {avatar("h-7 w-7")}
          </button>
          {accountOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-64 rounded-card border border-line bg-paper-soft p-2 shadow-[0_12px_32px_rgba(26,31,27,0.14)]"
            >
              <div className="border-b border-line px-3 pb-3 pt-2.5">
                <p className="truncate text-[0.95rem] font-medium text-ink">{user.name ?? "Signed in"}</p>
                <p className="mt-0.5 truncate text-small text-ink-mute">{user.email ?? ""}</p>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setAccountOpen(false)}
                className="mt-1.5 block rounded-[2px] px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors duration-200 hover:bg-sage-mist"
              >
                Your profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setAccountOpen(false)}
                className="block rounded-[2px] px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors duration-200 hover:bg-sage-mist"
              >
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className="mt-1 block w-full rounded-[2px] border-t border-line px-3 pb-2 pt-3 text-left text-[0.9rem] font-medium text-clay transition-colors duration-200 hover:text-clay/80"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={onSignIn}
        className={`text-[0.9rem] font-medium text-ink-soft transition-colors duration-200 hover:text-sage ${
          fullWidth ? "w-full rounded-input border border-line py-2.5 text-center" : ""
        }`}
      >
        Sign in
      </button>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-line bg-paper-soft transition-shadow duration-200 ${
        scrolled ? "shadow-[0_1px_0_rgba(26,31,27,0.06)]" : "shadow-none"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-5 min-[760px]:px-8 lg:px-10"
      >
        {/* Logo — ensō mark + lowercase wordmark */}
        <a href="#top" aria-label="Midori — back to top" className="flex shrink-0 items-center">
          <Logo />
        </a>

        {/* Center links — desktop only (mobile lives in the hamburger panel) */}
        <div className="hidden items-center gap-8 min-[760px]:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="underline-wobble text-[0.95rem] font-medium text-ink-soft transition-colors duration-200 hover:text-sage"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right cluster — always visible */}
        <div className="flex items-center gap-0.5 min-[760px]:gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
            className={`${ICON_BUTTON} w-auto gap-1.5 px-2.5`}
          >
            <Search size={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            <kbd className="hidden shrink-0 items-center whitespace-nowrap rounded-[2px] border border-line px-1.5 py-0.5 text-[0.6875rem] font-medium leading-none tracking-wide text-ink-mute min-[760px]:flex">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            onClick={openWishlist}
            aria-label={
              showWishlistBadge
                ? `Wishlist — ${wishlistCount} saved`
                : "Wishlist"
            }
            className={ICON_BUTTON}
          >
            <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
            {badge(showWishlistBadge, wishlistCount)}
          </button>

          <button
            type="button"
            onClick={openCart}
            aria-label={
              showCartBadge ? `Cart — ${cartCount} items` : "Cart"
            }
            className={ICON_BUTTON}
          >
            <ShoppingCart size={20} strokeWidth={1.5} aria-hidden="true" />
            {badge(showCartBadge, cartCount)}
          </button>

          <div className="hidden min-[760px]:flex">{authArea(false)}</div>

          {/* Hamburger — three lines that morph to an X (§6 row 16) */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="midori-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] min-[760px]:hidden"
          >
            <span
              className={`block h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-calm ${
                menuOpen ? "translate-y-[6.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-5 bg-ink transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-[1.5px] w-5 bg-ink transition-transform duration-300 ease-calm ${
                menuOpen ? "-translate-y-[6.5px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile panel — anchors + full-width sign-in (§5.18 mobile) */}
      {menuOpen && (
        <div
          id="midori-mobile-menu"
          className="border-t border-line bg-paper-soft px-5 pb-6 pt-2 min-[760px]:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-line/70 py-3.5 text-[0.95rem] font-medium text-ink-soft transition-colors duration-200 hover:text-sage"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-5">{authArea(true)}</div>
        </div>
      )}

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  );
}
