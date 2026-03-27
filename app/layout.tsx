import React from "react"
import type { Metadata } from "next"
import { DM_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"
import { Orbit } from "lucide-react"
import { getSiteUrl } from "@/lib/site-url"
import { BRAND_DEFAULT_TITLE, BRAND_NAME, BRAND_TITLE_TEMPLATE } from "@/lib/brand"
import { AppToaster } from "@/components/ui/app-toaster"

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
  // Body font (DM Sans) keeps preload; heading font loads on demand to cut critical-path bytes
  preload: false,
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

        <SiteHeader />
        
        <main id="main-content" className="flex-1">
          {children}
        </main>
        {/* Global Footer - Clean & Modern */}
        <footer className="mt-auto border-t border-border/80 py-14 no-print bg-background" role="contentinfo">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mb-10 text-xs text-muted-foreground/90">
              <Link href="/verification-notice" className="hover:text-foreground transition-colors">Verification notice</Link>
              <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
              <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
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
        <AppToaster />
      </body>
    </html>
  )
}

