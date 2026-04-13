import React from "react"
import { DM_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { AuthSessionProvider } from "@/components/auth-session-provider"
import { ChromeModeProvider } from "@/components/chrome-mode-provider"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"
import { NexusWordmark } from "@/components/nexus-wordmark"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"
import { AppToaster } from "@/components/ui/app-toaster"
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo"
import { buildRootStaticMetadata } from "@/lib/static-site-metadata"

export const metadata = buildRootStaticMetadata()

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b1220',
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
      <body
        className={cn("flex min-h-screen flex-col bg-page-mesh font-sans antialiased")}
        suppressHydrationWarning
      >
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
          <footer className="site-footer mt-auto py-14 sm:py-16 no-print" role="contentinfo">
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-10 xl:gap-14">
                <div className="max-w-md shrink-0">
                  <NexusWordmark heightClass="h-28 sm:h-32" className="max-w-[40rem] sm:max-w-[52rem]" />
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    Fundraising match engine: VCs, angels, accelerators, and corporate venture. Built for clarity, not
                    clutter.
                  </p>
                </div>

                <div className="grid w-full min-w-0 max-w-xl shrink-0 grid-cols-1 gap-10 sm:max-w-none sm:grid-cols-3 sm:gap-x-8 md:gap-x-12 lg:max-w-3xl">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Product</p>
                    <nav className="mt-4 flex flex-col items-start gap-2.5 text-sm" aria-label="Footer product">
                      <Link
                        href="/founder"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        For founders
                      </Link>
                      <Link
                        href="/investor"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        For investors
                      </Link>
                      <Link
                        href="/pricing"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        Pricing
                      </Link>
                    </nav>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Company</p>
                    <nav className="mt-4 flex flex-col items-start gap-2.5 text-sm" aria-label="Footer company">
                      <Link
                        href="/about"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        About
                      </Link>
                      <Link
                        href="/contact"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        Contact
                      </Link>
                      <Link
                        href="/vc-guide"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        VC guide
                      </Link>
                    </nav>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Legal &amp; trust</p>
                    <nav className="mt-4 flex flex-col items-start gap-2.5 text-sm" aria-label="Footer legal">
                      <Link
                        href="/legal"
                        className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        Privacy, terms &amp; security
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-3 border-t border-border/30 pt-8 dark:border-white/[0.06] sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="text-xs leading-relaxed text-muted-foreground/90">
                  © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_NAME}. Information and tools
                  only. We do not broker or advise on securities.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground/75 sm:max-w-xs sm:text-right">{BRAND_TAGLINE}</p>
              </div>
            </div>
          </footer>
          <AppToaster />
          </ChromeModeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}

