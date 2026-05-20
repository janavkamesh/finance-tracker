/**
 * Extend NextAuth's built-in types so TypeScript knows about the extra fields
 * we store in the JWT (Google id_token) and expose in the Session.
 */
import "next-auth";
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    /** Raw Google ID-token — forwarded to Supabase `signInWithIdToken` */
    googleIdToken?: string;
  }
}

declare module "next-auth" {
  interface Session {
    /** Populated from the JWT; consumers can read this if needed. */
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
