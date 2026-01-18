import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { NavAuth } from "@/components/nav-auth"
import { ProtectedNavLink } from "@/components/protected-nav-link"
import Link from "next/link"
import { Heart } from "lucide-react"
import { MobileNav } from "@/components/ui/mobile-nav"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://foundermatch.com'),
  title: {
    default: "FounderMatch - Find Your Perfect Investor",
    template: "%s | FounderMatch"
  },
  description: "AI-powered platform connecting founders with 1,002 verified investors. Get matched with VCs who actually fund startups like yours through intelligent analysis of your pitch idea, deck, and video pitch.",
  keywords: ["venture capital", "VC matching", "founder", "investor", "startup funding", "AI matching", "pitch deck", "fundraising"],
  authors: [{ name: "FounderMatch", url: "https://foundermatch.com" }],
  creator: "FounderMatch",
  publisher: "FounderMatch",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://foundermatch.com",
    siteName: "FounderMatch",
    title: "FounderMatch - Find Your Perfect Investor",
    description: "AI-powered platform connecting founders with 1,002 verified investors. Smart matching through pitch analysis and evidence-based recommendations.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FounderMatch - Find Your Perfect Investor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FounderMatch - Find Your Perfect Investor",
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
    <html lang="en" className="scroll-smooth">
      <body className={cn(inter.className, "min-h-screen bg-background antialiased")} suppressHydrationWarning>
        <SessionKeeper />
        
        {/* Skip to main content - Accessibility */}
        <a 
          href="#main-content" 
          className="skip-to-main focus:top-4 rounded"
        >
          Skip to main content
        </a>

        {/* Global Header - Clean & Simple */}
        <header className="border-b border-slate-200/60 bg-white sticky top-0 z-50 no-print shadow-sm">
          <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity group">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-slate-900">FounderMatch</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 text-sm" role="navigation" aria-label="Main navigation" suppressHydrationWarning>
              <ProtectedNavLink href="/founder/discover" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md transition-colors font-medium">Discover</ProtectedNavLink>
              <ProtectedNavLink href="/founder/ai-analysis" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md transition-colors font-medium">AI Analysis</ProtectedNavLink>
              <ProtectedNavLink href="/pricing" publicRoute className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md transition-colors font-medium">Pricing</ProtectedNavLink>
              <div className="ml-2 pl-2 border-l border-slate-200" suppressHydrationWarning>
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
        <footer className="mt-auto border-t border-slate-100 py-12 no-print bg-slate-50/50" role="contentinfo">
          <div className="container mx-auto max-w-6xl px-4">
            {/* Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-8">
              <Link href="/privacy" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Terms</Link>
              <Link href="/about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</Link>
              <Link href="/verification-notice" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Verification</Link>
              <Link href="/security" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Security</Link>
              <Link href="/contact" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
            </div>
            
            {/* Brand and Copyright */}
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="font-semibold text-slate-900">FounderMatch</span>
              </div>
              <p className="text-sm text-slate-600">
                © 2025 FounderMatch. Made with <span className="text-red-500">❤️</span> for founders.
              </p>
            </div>
            
            {/* Disclaimer */}
            <p className="text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
              FounderMatch provides information and tools only. We do not broker, solicit, or advise on securities.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}

