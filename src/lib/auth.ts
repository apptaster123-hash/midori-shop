// NextAuth v4 configuration (next-auth 4.24.x — the v4 line, per the scaffold).
//
// Two modes, chosen at boot from the environment:
//  1. Real Google OAuth — used when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are
//     set to non-placeholder values (PRD §7.1). See "REAL GOOGLE CREDS" below.
//  2. Demo credentials provider — used otherwise, so the shop is fully usable
//     (prefill, sign-in state) before real Google credentials exist. It accepts
//     any name + email and issues a JWT session.
//
// JWT strategy in both cases (PRD §8.1), so no adapter is required and no DB
// rows are written at sign-in. If DB-backed users are wanted later, install
// @next-auth/prisma-adapter@^1 (v4 line) and add `adapter: PrismaAdapter(prisma)`
// — the User/Account/Session/VerificationToken models already exist (§8.1).
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const UNSET = new Set(["", "placeholder", "generate-and-paste", "your-google-client-id", "your-google-client-secret"]);

function hasRealGoogleCredentials(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  return !UNSET.has(id.toLowerCase()) && !UNSET.has(secret.toLowerCase());
}

// ---------------------------------------------------------------------------
// REAL GOOGLE CREDS PLUG IN HERE:
//   1. Create OAuth client (type "Web application") in Google Cloud Console.
//   2. Authorized redirect URI: {NEXTAUTH_URL}/api/auth/callback/google
//   3. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env (non-placeholder).
//   4. The provider below activates automatically; /api/auth/providers then
//      advertises "google" and the sign-in button switches to Google
//      (see primaryProviderId() in src/lib/auth-client.ts).
// ---------------------------------------------------------------------------
function buildProviders(): NextAuthOptions["providers"] {
  if (hasRealGoogleCredentials()) {
    return [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    ];
  }
  return [
    CredentialsProvider({
      id: "demo",
      name: "Demo sign-in",
      credentials: {
        name: { label: "Your name", type: "text" },
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        if (email === "") return null;
        const name =
          typeof credentials?.name === "string" && credentials.name.trim() !== ""
            ? credentials.name.trim()
            : email.split("@")[0];
        // The `id` is required by the User type; with JWT strategy it never
        // leaves the token, so a stable synthetic value is fine.
        return { id: "demo-user", name, email, image: null };
      },
    }),
  ];
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "insecure-development-secret",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: buildProviders(),
  callbacks: {
    // On sign-in, copy the provider/credentials user into the JWT.
    jwt({ token, user }) {
      if (user) {
        token.name = user.name ?? null;
        token.email = user.email ?? null;
        token.image = user.image ?? null;
      }
      return token;
    },
    // Expose { name, email, image } on every session (PRD §5.11 prefill).
    session({ session, token }) {
      if (session.user) {
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email = typeof token.email === "string" ? token.email : null;
        session.user.image = typeof token.image === "string" ? token.image : null;
      }
      return session;
    },
  },
  debug: false,
};
