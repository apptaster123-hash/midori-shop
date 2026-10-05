// Server-side session helper (server components + route handlers).
// Server-only: pulls the NextAuth JWT session via getServerSession.
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export interface CurrentUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

/** The signed-in user for this request, or null (incl. guest checkout). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return null;
  return {
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
}
