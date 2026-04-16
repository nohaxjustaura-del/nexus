import React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { SessionKeeper } from "@/components/session-keeper"
import { AuthSessionProvider } from "@/components/auth-session-provider"
import { AccountCapabilitiesProvider } from "@/components/account-capabilities-provider"
import { ChromeModeProvider } from "@/components/chrome-mode-provider"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { NexusWordmark } from "@/components/nexus-wordmark"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"
import { AppToaster } from "@/components/ui/app-toaster"
import { WebVitalsReporter } from "@/components/web-vitals-reporter"
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo"
import { buildRootStaticMetadata } from "@/lib/static-site-metadata"

export const metadata = buildRootStaticMetadata()

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#101828',
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode
}>

function FooterChromeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none ring-offset-background transition-colors hover:bg-muted/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span>{children}</span>
      <ChevronRight
        className="size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-50"
        aria-hidden
      />
    </Link>
  )
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={cn("dark scroll-smooth", inter.variable)}>
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
        className={cn("flex min-h-screen flex-col bg-page-mesh font-sans antialiased text-[15px]")}
        suppressHydrationWarning
      >
        <WebVitalsReporter />
        <SessionKeeper />
        <AuthSessionProvider>
          <AccountCapabilitiesProvider>
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
            <footer className="site-footer bg-noise mt-auto py-10 sm:py-12 no-print" role="contentinfo">
              <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_auto] lg:items-start lg:gap-16 xl:gap-20">
                  <div className="min-w-0 max-w-md">
                    <Link
                      href="/"
                      className="inline-flex rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <NexusWordmark
                        heightClass="min-h-9 sm:min-h-10"
                        className="max-w-none text-lg sm:text-xl"
                      />
                    </Link>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                      Investor intelligence for founders.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-8 rounded-2xl border border-border/55 bg-gradient-to-br from-muted/25 via-muted/10 to-transparent p-6 shadow-sm backdrop-blur-sm sm:gap-12 sm:p-8">
                    <nav className="flex min-w-[9.5rem] flex-col gap-1" aria-label="Footer product">
                      <p className="eyebrow-label mb-2 text-foreground/70">Product</p>
                      <FooterChromeLink href="/founder">Founders</FooterChromeLink>
                      <FooterChromeLink href="/investor">Investors</FooterChromeLink>
                      <FooterChromeLink href="/pricing">Pricing</FooterChromeLink>
                    </nav>
                    <nav className="flex min-w-[9.5rem] flex-col gap-1" aria-label="Footer company">
                      <p className="eyebrow-label mb-2 text-foreground/70">Company</p>
                      <FooterChromeLink href="/about">About</FooterChromeLink>
                      <FooterChromeLink href="/contact">Contact</FooterChromeLink>
                      <FooterChromeLink href="/legal">Legal</FooterChromeLink>
                    </nav>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-border/45 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs tracking-wide text-muted-foreground">
                    © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_NAME}
                  </p>
                </div>
              </div>
            </footer>
            <AppToaster />
            </ChromeModeProvider>
          </AccountCapabilitiesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}

