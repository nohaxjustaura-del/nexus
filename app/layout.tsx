import React from "react"
import type { Metadata } from "next"
import { DM_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { NavAuth } from "@/components/nav-auth"
import { ProtectedNavLink } from "@/components/protected-nav-link"
import Link from "next/link"
import { Orbit } from "lucide-react"
import { MobileNav } from "@/components/ui/mobile-nav"
import { getSiteUrl } from "@/lib/site-url"
import { BRAND_DEFAULT_TITLE, BRAND_NAME, BRAND_TITLE_TEMPLATE } from "@/lib/brand"

const siteUrl = getSiteUrl()

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
})

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-heading",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND_DEFAULT_TITLE,
    template: BRAND_TITLE_TEMPLATE,
  },
  description: "AI-powered platform connecting founders with 1,002 verified investors. Get matched with VCs who actually fund startups like yours through intelligent analysis of your pitch idea, deck, and video pitch.",
  keywords: ["venture capital", "VC matching", "founder", "investor", "startup funding", "AI matching", "pitch deck", "fundraising"],
  authors: [{ name: BRAND_NAME, url: siteUrl }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: BRAND_NAME,
    title: BRAND_DEFAULT_TITLE,
    description: "AI-powered platform connecting founders with 1,002 verified investors. Smart matching through pitch analysis and evidence-based recommendations.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: BRAND_DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_DEFAULT_TITLE,
    description: "AI-powered platform connecting founders with compatible VCs",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  verification: {
    // Add verification tokens here when available
    // google: 'your-google-verification-token',
    // yandex: 'your-yandex-verification-token',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("dark scroll-smooth", dmSans.variable, outfit.variable)}>
      <body className={cn("min-h-screen bg-background font-sans antialiased")} suppressHydrationWarning>
        <SessionKeeper />
        
        {/* Skip to main content - Accessibility */}
        <a 
          href="#main-content" 
          className="skip-to-main focus:top-4 rounded"
        >
          Skip to main content
        </a>

        <header className="sticky top-0 z-50 no-print border-b border-border/80 bg-background/80 backdrop-blur-xl ring-1 ring-white/[0.03] supports-[backdrop-filter]:bg-background/55">
          <div className="container mx-auto max-w-7xl flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg -ml-1 px-1 py-0.5 hover:bg-foreground/[0.03] transition-colors group"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <Orbit className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 text-sm" role="navigation" aria-label="Main navigation" suppressHydrationWarning>
              <ProtectedNavLink href="/founder/discover" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors font-medium">Discover</ProtectedNavLink>
              <ProtectedNavLink href="/founder/ai-analysis" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors font-medium">AI Analysis</ProtectedNavLink>
              <ProtectedNavLink href="/pricing" publicRoute className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors font-medium">Pricing</ProtectedNavLink>
              <div className="ml-3 pl-3 border-l border-border" suppressHydrationWarning>
                <NavAuth />
              </div>
            </nav>
            
            {/* Mobile Navigation */}
            <div className="lg:hidden flex items-center gap-2">
              <MobileNav links={[
                { href: "/founder/discover", label: "Discover VCs" },
                { href: "/founder/ai-analysis", label: "AI Analysis" },
                { href: "/pricing", label: "Pricing" },
                { href: "/vc/claim", label: "For VCs" }
              ]} />
              <NavAuth />
            </div>
          </div>
        </header>
        
        <main id="main-content" className="flex-1">
          {children}
        </main>
        {/* Global Footer - Clean & Modern */}
        <footer className="mt-auto border-t border-border py-14 no-print bg-muted/30" role="contentinfo">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mb-10">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link href="/verification-notice" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Verification</Link>
              <Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Orbit className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="font-heading font-semibold text-foreground">{BRAND_NAME}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {BRAND_NAME}. Built for founders.
              </p>
            </div>

            <p className="text-center text-xs text-muted-foreground/90 max-w-xl mx-auto leading-relaxed">
              {BRAND_NAME} provides information and tools only. We do not broker, solicit, or advise on securities.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}

