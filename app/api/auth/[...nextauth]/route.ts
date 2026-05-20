/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Catch-all Next.js App Router handler for all NextAuth endpoints:
 *   GET  /api/auth/signin
 *   GET  /api/auth/signout
 *   GET  /api/auth/callback/google
 *   GET  /api/auth/session
 *   GET  /api/auth/csrf
 *   GET  /api/auth/providers
 *   … etc.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
