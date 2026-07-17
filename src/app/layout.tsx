import type { Metadata } from "next";
import { IBM_Plex_Mono, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

/*
 * Two monospace faces, no sans. Roboto Mono is the primary and IBM Plex Mono the
 * fallback, mirroring the reference's stack order; both are self-hosted by
 * next/font so the terminal never flashes a system fallback on first paint.
 */
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TERM — Financial Intelligence Terminal",
  description: "A dense, keyboard-first market intelligence workspace. Inspired by professional trading terminals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${robotoMono.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      {/* Amber is the default ink (see globals.css) — no text colour here. */}
      <body className="bg-void font-mono">
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
