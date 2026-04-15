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
            <footer className="site-footer mt-auto py-8 sm:py-10 no-print" role="contentinfo">
              <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                  {/* Brand */}
                  <div className="min-w-0 max-w-xs">
                    <NexusWordmark
                      heightClass="h-9 sm:h-10"
                      className="max-w-[10rem] sm:max-w-[11rem]"
                    />
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground/70">
                      Investor intelligence for founders.
                    </p>
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap gap-x-10 gap-y-6">
                    <nav className="flex flex-col gap-2 text-sm" aria-label="Footer product">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Product</p>
                      <Link href="/founder" className="text-muted-foreground transition-colors hover:text-foreground">Founders</Link>
                      <Link href="/investor" className="text-muted-foreground transition-colors hover:text-foreground">Investors</Link>
                      <Link href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
                    </nav>
                    <nav className="flex flex-col gap-2 text-sm" aria-label="Footer company">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Company</p>
                      <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">About</Link>
                      <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">Contact</Link>
                      <Link href="/legal" className="text-muted-foreground transition-colors hover:text-foreground">Legal</Link>
                    </nav>
                  </div>
                </div>

                <div className="mt-8 border-t border-border/40 pt-5">
                  <p className="text-[11px] text-muted-foreground/50">
                    © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_NAME}.
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

