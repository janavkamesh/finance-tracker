import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { NextAuthProvider } from "@/components/providers/next-auth-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinTrack India — Personal Finance Tracker",
  description:
    "Track your income, expenses, and savings tailored for Indian working professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/*
          NextAuthProvider must wrap ThemeProvider (and everything else) so that
          useSession() is available anywhere in the tree, including inside themed
          components.  It is a Client Component boundary; ThemeProvider and the
          page tree remain Server Components where possible.
        */}
        <NextAuthProvider>
          <ThemeProvider>
            {children}
            <Toaster
              richColors
              position="bottom-right"
              offset={24}
              toastOptions={{
                style: { zIndex: 9999 },
              }}
            />
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
