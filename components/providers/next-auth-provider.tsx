"use client";

/**
 * components/providers/next-auth-provider.tsx
 *
 * Thin client-component wrapper around NextAuth's SessionProvider.
 * Must be a Client Component because SessionProvider uses React context.
 * Placed here so the Root Layout (a Server Component) can import it without
 * being forced to become a Client Component itself.
 */

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function NextAuthProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}
