import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { REPO_URL, SITE_NAME } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description:
    "What live-service publishers put on their roadmaps, when they said it would arrive, and when it did. Every row cites the archived roadmap and the patch note.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://roadmap-promise-tracker.vercel.app"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        <header className="border-b border-border">
          <nav aria-label="Primary" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              {SITE_NAME}
            </Link>
            <Link href="/roadmaps" className="hover:underline">
              Games
            </Link>
            <Link href="/roadmaps/methodology" className="hover:underline">
              Methodology
            </Link>
            <Link href="/roadmaps/request" className="hover:underline">
              Request a game
            </Link>
            <Link href="/corrections" className="hover:underline">
              Corrections
            </Link>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted">
            <span>Receipts, not opinion. Every row cites an archived publisher page or patch note.</span>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <a href={REPO_URL} className="hover:underline">
              Source and data
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
