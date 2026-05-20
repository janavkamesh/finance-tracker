/**
 * app/api/auth/nextauth-callback/route.ts
 *
 * SESSION BRIDGE — the architectural centrepiece of this integration.
 *
 * Why this route exists
 * ─────────────────────
 * NextAuth stores its own JWT in `next-auth.session-token`, but every server
 * action and RSC in this codebase calls `supabase.auth.getUser()` which reads
 * Supabase's *own* session cookies (`sb-<ref>-auth-token`).  Running two
 * independent sessions would require rewriting every data-fetching call.
 *
 * Instead, after NextAuth completes its OAuth dance it redirects here.  This
 * route reads the Google id_token that was stashed inside the NextAuth JWT,
 * hands it to Supabase's `signInWithIdToken`, and captures the resulting
 * Supabase session cookies onto the same redirect response.  The browser then
 * follows the redirect to /dashboard carrying both sets of cookies — so every
 * existing `supabase.auth.getUser()` call keeps working with zero changes.
 *
 * Prerequisites (Supabase dashboard)
 * ────────────────────────────────────
 * Authentication → Providers → Google → enable and set the *same*
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET used by NextAuth.  Supabase uses
 * the client-id to verify the Google id_token signature via JWKS.
 *
 * Security notes
 * ──────────────
 * • The Google id_token never leaves the server — it lives only in the
 *   encrypted `next-auth.session-token` HTTP-only cookie.
 * • `getToken` verifies the NextAuth JWT signature before reading any field.
 * • We write Supabase cookies directly onto the redirect `Response` object;
 *   they are never exposed to JavaScript (HttpOnly by default via @supabase/ssr).
 */

import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  // ── 1. Verify & read the NextAuth JWT ──────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token?.googleIdToken) {
    // No valid NextAuth session or missing id_token — abort.
    console.error("[nextauth-callback] Missing or invalid NextAuth token");
    return NextResponse.redirect(
      `${origin}/login?error=OAuthSessionMissing`,
    );
  }

  // ── 2. Prepare the redirect response we will decorate with cookies ─────────
  //  We build the response first so the Supabase client can write Set-Cookie
  //  headers directly onto it before we return.
  const response = NextResponse.redirect(`${origin}/dashboard`);

  // ── 3. Create a Supabase client that writes cookies onto our response ───────
  //  Using @supabase/ssr's createServerClient with a manual cookie adapter
  //  (instead of the cached createClient from lib/supabase/server.ts) because
  //  Route Handlers need to write cookies onto a specific Response object.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ── 4. Exchange the Google id_token for a Supabase session ────────────────
  //  Supabase verifies the token with Google's JWKS, auto-creates the user in
  //  auth.users if first sign-in, and returns a full session (access + refresh).
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: token.googleIdToken as string,
  });

  if (error) {
    console.error(
      "[nextauth-callback] signInWithIdToken failed:",
      error.message,
    );
    return NextResponse.redirect(
      `${origin}/login?error=OAuthCallbackError`,
    );
  }

  // ── 5. Return the redirect — Supabase session cookies are already set ──────
  return response;
}
