/**
 * lib/auth.ts — NextAuth v4 configuration
 *
 * Only GoogleProvider is wired here.  Email / password auth continues to flow
 * through the existing Supabase server actions (actions/auth.ts) unchanged.
 *
 * Session strategy: JWT (stateless, no DB adapter required).
 *
 * The Google `id_token` is stored inside the JWT so the dedicated
 * /api/auth/nextauth-callback route can hand it off to Supabase's
 * `signInWithIdToken` and create a first-class Supabase session — meaning
 * every existing server action that calls `supabase.auth.getUser()` keeps
 * working without a single line of change.
 */

import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // openid is required to receive an id_token from Google.
          // email + profile give us name / avatar for the session object.
          scope: "openid email profile",
          // Force account-selection prompt so users can switch Google accounts.
          prompt: "select_account",
        },
      },
    }),
  ],

  callbacks: {
    /**
     * jwt — runs server-side when a token is created or refreshed.
     *
     * On the initial sign-in the `account` object is present and contains
     * Google's id_token.  We persist it into the JWT so the callback route
     * can read it later via `getToken()`.
     */
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.id_token) {
        token.googleIdToken = account.id_token;
      }
      return token;
    },

    /**
     * session — shapes the client-visible session object.
     *
     * We intentionally do NOT expose googleIdToken here; it stays server-side
     * inside the encrypted JWT cookie and is never sent to the browser.
     */
    async session({ session }) {
      return session;
    },
  },

  /**
   * Custom pages — keep the existing auth UI instead of NextAuth's defaults.
   */
  pages: {
    signIn: "/login",
    error: "/login",   // error query param will be added automatically
  },

  session: {
    strategy: "jwt",
    // 30-day sliding window — matches Supabase's default refresh-token TTL.
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
