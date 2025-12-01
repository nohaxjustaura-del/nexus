import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { NavAuth } from "@/components/nav-auth"
import { ProtectedNavLink } from "@/components/protected-nav-link"
import Link from "next/link"
import { Heart } from "lucide-react"

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
  description: "AI-powered platform connecting founders with compatible VCs, angels, and mentors. Evidence-based matching by stage, sector, check size, and working style.",
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
    description: "AI-powered platform connecting founders with compatible VCs, angels, and mentors",
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
      <body className={cn(inter.className, "min-h-screen bg-background antialiased")}>
        <SessionKeeper />
        
        {/* Skip to main content - Accessibility */}
        <a 
          href="#main-content" 
          className="skip-to-main focus:top-4 rounded"
        >
          Skip to main content
        </a>

        {/* Global Header - Clean & Modern */}
        <header className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 no-print transition-all">
          <div className="container mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-all group">
              <Heart className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xl font-bold text-slate-900">FounderMatch</span>
            </Link>
            <nav className="hidden md:flex items-center gap-0.5 text-sm" role="navigation" aria-label="Main navigation" suppressHydrationWarning>
              <ProtectedNavLink href="/founder/discover" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg transition-all font-medium">For Founders</ProtectedNavLink>
              <ProtectedNavLink href="/vc/claim" publicRoute className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg transition-all font-medium">For VCs</ProtectedNavLink>
              <ProtectedNavLink href="/founder/ai-analysis" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg transition-all font-medium">AI Analysis</ProtectedNavLink>
              <ProtectedNavLink href="/pricing" publicRoute className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg transition-all font-medium">Pricing</ProtectedNavLink>
              <div className="ml-3 pl-3 border-l border-slate-200" suppressHydrationWarning>
                <NavAuth />
              </div>
            </nav>
            
            {/* Mobile Navigation - Hidden on desktop */}
            <div className="md:hidden flex items-center gap-2">
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

