// Client-side helper for the sign-in button (PRD §5.18).
// Asks the auth endpoint which provider is live, so the button can route to
// Google when real credentials exist and to the demo sign-in otherwise.
// Never import server-only modules here (no next-auth server code, no prisma).

export type PrimaryProviderId = "google" | "demo";

/** Which provider should the sign-in button use? Tolerates any failure. */
export async function primaryProviderId(): Promise<PrimaryProviderId> {
  try {
    const res = await fetch("/api/auth/providers", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return "demo";
    const data: unknown = await res.json();
    // NextAuth answers with an object keyed by provider id, e.g. { demo: {...} }
    // or { google: {...} } once real Google credentials are configured.
    if (typeof data === "object" && data !== null && "google" in data) {
      return "google";
    }
    return "demo";
  } catch {
    return "demo";
  }
}
