// Middleware redirects "/" → /dashboard or /login based on session.
// This file exists only so Next.js doesn't 404 if middleware is bypassed.
export default function RootPage() {
  return null;
}
