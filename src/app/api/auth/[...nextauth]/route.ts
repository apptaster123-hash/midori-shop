// NextAuth v4 handler for the App Router (PRD §9: GET/POST /api/auth/[...nextauth]).
import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
