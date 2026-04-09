import React from "react"
import type { Metadata } from "next"
import { DM_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { AuthSessionProvider } from "@/components/auth-session-provider"
import { ChromeModeProvider } from "@/components/chrome-mode-provider"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"
import { NexusWordmark } from "@/components/nexus-wordmark"
import { getSiteUrl } from "@/lib/site-url"
import { BRAND_DEFAULT_TITLE, BRAND_NAME, BRAND_TITLE_TEMPLATE } from "@/lib/brand"
import { AppToaster } from "@/components/ui/app-toaster"
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from "@/lib/investor-public-stats"
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo"

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

export async function generateMetadata(): Promise<Metadata> {
  const verifiedCount = await getVerifiedInvestorCount()
  const label = formatVerifiedInvestorCount(verifiedCount)
  const description = `NEXUS is fundraising intelligence built for investor fit. It reads your pitch like an investor would, scores fit, and ranks ${label}+ verified VCs, angels, accelerators, and corporate venture arms. You get a shortlist tied to real mandates, not a generic chatbot list of who might invest.`
  const ogDescription = `${label}+ verified investors ranked to your story and stage. Shortlists, rationale, and outreach in one workflow, not a one-off answer from a general chat model.`

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: BRAND_DEFAULT_TITLE,
      template: BRAND_TITLE_TEMPLATE,
    },
    description,
    keywords: [
      "fundraising match engine",
      "investor matching",
      "founder fundraising",
      "startup funding",
      "pitch deck analysis",
      "VC matching",
      "angel investors",
      "accelerator matching",
      "corporate venture",
      "investor discovery",
    ],
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
      description: ogDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_DEFAULT_TITLE,
      description:
        "Ranked investor shortlists from your pitch using verified mandates, clear scores, and workflow tools. More specific than asking a general AI who to email.",
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
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1D3567',
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={cn("dark scroll-smooth", dmSans.variable, outfit.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOrganizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateWebsiteSchema()) }}
        />
      </head>
      <body className={cn("flex min-h-screen flex-col bg-background font-sans antialiased")} suppressHydrationWarning>
        <SessionKeeper />
        <AuthSessionProvider>
          <ChromeModeProvider>
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
          <footer className="mt-auto border-t border-border/30 bg-muted/[0.06] py-12 sm:py-14 no-print" role="contentinfo">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
                <div className="max-w-sm shrink-0">
                  <NexusWordmark heightClass="h-28 sm:h-32" className="max-w-[40rem] sm:max-w-[52rem]" />
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Fundraising match engine: VCs, angels, accelerators, and corporate venture. Built for clarity, not clutter.
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-16 gap-y-10 sm:gap-x-20">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Product</p>
                    <nav className="mt-3 flex flex-col gap-2 text-sm" aria-label="Footer product">
                      <Link href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">
                        Pricing
                      </Link>
                      <Link href="/vc-guide" className="text-muted-foreground transition-colors hover:text-foreground">
                        VC guide
                      </Link>
                      <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                        About
                      </Link>
                      <Link href="/company" className="text-muted-foreground transition-colors hover:text-foreground">
                        Company
                      </Link>
                      <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                        Contact
                      </Link>
                    </nav>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Legal & trust</p>
                    <nav className="mt-3 flex flex-col gap-2 text-sm" aria-label="Footer legal">
                      <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                        Privacy
                      </Link>
                      <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
                        Terms
                      </Link>
                      <Link href="/verification-notice" className="text-muted-foreground transition-colors hover:text-foreground">
                        Verification notice
                      </Link>
                      <Link href="/security" className="text-muted-foreground transition-colors hover:text-foreground">
                        Security
                      </Link>
                      <Link href="/disclaimer" className="text-muted-foreground transition-colors hover:text-foreground">
                        Disclaimer
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>

              <p className="mt-10 border-t border-border/25 pt-8 text-center text-xs leading-relaxed text-muted-foreground/85 sm:mt-12">
                ©{' '}
                <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_NAME}. Information and tools
                only. We do not broker or advise on securities.
              </p>
            </div>
          </footer>
          <AppToaster />
          </ChromeModeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}

