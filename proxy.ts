/**
 * proxy.ts  (Vercel edge proxy — equivalent to Next.js middleware)
 *
 * Runs on every request that matches the `config.matcher` below.
 * Delegates route-protection logic to lib/supabase/middleware.ts which:
 *   • Refreshes the Supabase session cookie on every request
 *   • Redirects unauthenticated users to /login
 *   • Redirects already-authenticated users away from /login and /signup
 *
 * NextAuth endpoints (/api/auth/*) are intentionally excluded from the
 * matcher so NextAuth's own route handler is never intercepted.  The
 * session-bridge route (/api/auth/nextauth-callback) is also excluded
 * for the same reason — it sets the Supabase cookies itself.
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *   • _next/static  — bundled assets
     *   • _next/image   — image optimisation
     *   • favicon.ico   — browser favicon
     *   • api/auth/*    — NextAuth endpoints (including /api/auth/nextauth-callback)
     *   • static files  — svg, png, jpg, jpeg, gif, webp
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
