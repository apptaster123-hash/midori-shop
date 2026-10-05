"use client";

// Sign-in dialog (PRD §5.18): the calm, in-app way to sign in.
// Demo mode asks for name + email and signs in without leaving the page.
// With real Google credentials (README §5) it becomes a Google button.
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { X } from "lucide-react";
import { primaryProviderId } from "@/lib/auth-client";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState<"google" | "demo" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Ask the server which provider is live each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    void primaryProviderId().then(setProvider);
  }, [open]);

  // Esc closes while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const emailOk = EMAIL_RE.test(email.trim());
  const canSubmit = name.trim().length >= 2 && emailOk && !busy;

  const submit = async () => {
    if (provider === "google") {
      setBusy(true);
      await signIn("google");
      return;
    }
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn("demo", {
        name: name.trim(),
        email: email.trim(),
        redirect: false,
      });
      // next-auth resolves with a url even on failure (redirect:false); a
      // failed credentials sign-in lands on the error URL — treat it as one.
      if (result && "error" in result && result.error) {
        setError("That didn't go through — try again.");
        setBusy(false);
        return;
      }
      onClose();
    } catch {
      setError("That didn't go through — try again.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Midori"
    >
      <button
        type="button"
        aria-label="Close sign in"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,31,27,0.4)]"
      />
      <div className="relative w-full max-w-md rounded-card border border-line bg-paper-soft p-8 shadow-[0_18px_50px_rgba(26,31,27,0.16)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:text-ink"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <p className="text-small uppercase tracking-[0.18em] text-sage">Midori · 緑</p>
        <h2 className="mt-2 font-display text-[1.5rem] leading-tight text-ink">Sign in</h2>
        <p className="mt-2 text-small text-ink-mute">
          To prefill checkout, keep your orders together, and reach Nurse Elizabeth faster.
        </p>

        {provider === "google" ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="mt-6 w-full rounded-full bg-sage px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep disabled:opacity-60"
          >
            Continue with Google
          </button>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                Your name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                autoFocus
                className="mt-1.5 w-full rounded-[2px] border border-line bg-paper px-3 py-2.5 text-[0.95rem] text-ink outline-none transition-colors duration-200 focus:border-sage"
              />
            </label>
            <label className="block">
              <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-ink-mute">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-[2px] border border-line bg-paper px-3 py-2.5 text-[0.95rem] text-ink outline-none transition-colors duration-200 focus:border-sage"
              />
              <span className="mt-1 block text-small text-ink-mute">
                Your orders are kept against this email.
              </span>
            </label>
            {error !== "" && (
              <p role="alert" className="rounded-[2px] border border-clay/40 bg-clay/10 px-3 py-2 text-small text-clay">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-sage px-7 py-3 text-[0.95rem] font-medium text-paper transition-colors duration-200 hover:bg-sage-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Signing you in…" : "Continue"}
            </button>
            <p className="text-center text-small text-ink-mute">
              Demo sign-in — no password. Add Google sign-in with your own credentials later (the
              README walks you through it).
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
