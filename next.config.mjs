import bundleAnalyzer from '@next/bundle-analyzer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin tracing to this app — avoids picking up C:\Users\nohax\package-lock.json as the monorepo root.
  outputFileTracingRoot: projectRoot,
  // ESM Radix primitives: avoids occasional client chunk `options.factory` undefined (RSC ↔ webpack).
  transpilePackages: [
    '@radix-ui/react-accordion',
    '@radix-ui/react-collapsible',
  ],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Dev fetch tree (GET … │ GET https://… (cache skip) │ │ Cache skipped reason: …):
  // In Next 15+, defining `logging.fetches` *enables* that nested fetch logging; `fullUrl` only
  // shortens URLs. Omit `logging` entirely for a clean terminal. To debug upstream fetches,
  // temporarily add: `logging: { fetches: { fullUrl: true } }`.

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-accordion',
      '@radix-ui/react-collapsible',
      'framer-motion',
      'react-markdown',
      'lucide-react',
    ],
    /**
     * Critical CSS inlining + stylesheet preload can throw in the client chunk loader
     * (`lazy-dynamic/preload-css`: "Cannot read properties of undefined (reading 'call')")
     * on navigations such as `/founder/dashboard` (Next 15.5.x + webpack). Prefer stable CSS loading.
     */
    optimizeCss: false,
  },

  /**
   * Windows: webpack’s default filesystem cache under `.next/cache/webpack` often races with
   * hot restarts, `next.config` reloads, antivirus, or a second dev server on another port —
   * leading to ENOENT on `*.pack.gz` and client runtime `options.factory` / `.call` errors.
   * Disabling persistent cache in dev trades a bit of compile speed for stability.
   * If you see ENOENT on `.next/server/edge-chunks/*.wasm`, stop `next dev`, run
   * `node scripts/optimize.js`, then `npm run dev` (or `npm run dev:fresh`).
   */
  webpack: (config, { dev }) => {
    if (dev && process.platform === 'win32') {
      config.cache = false
    }
    return config
  },

  async redirects() {
    return [
      { source: '/founder/resources', destination: '/founder/network', permanent: true },
      { source: '/founder/resources/:slug*', destination: '/founder/network/:slug*', permanent: true },
      { source: '/privacy', destination: '/legal#privacy', permanent: true },
      { source: '/terms', destination: '/legal#terms', permanent: true },
      { source: '/verification-notice', destination: '/legal#verification', permanent: true },
      { source: '/security', destination: '/legal#security', permanent: true },
      { source: '/admin/more', destination: '/admin/dashboard', permanent: true },
      { source: '/founder/credits', destination: '/pricing', permanent: true },
    ]
  },

  // Headers for caching and security
  async headers() {
    const globalSecurity = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=()',
      },
    ]
    if (process.env.NODE_ENV === 'production') {
      globalSecurity.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      })
    }
    const base = [
      {
        source: '/:path*',
        headers: globalSecurity,
      },
    ]

    // In `next dev`, chunk paths and webpack runtime churn; `immutable` makes the browser keep
    // stale `/_next/static/chunks/*` and surfaces ChunkLoadError / `options.factory` undefined.
    if (process.env.NODE_ENV !== 'production') {
      return base
    }

    return [
      ...base,
      {
        // Never override Content-Type here: this pattern matches CSS, fonts, and JS.
        // Forcing application/javascript breaks styles + RSC/webpack under X-Content-Type-Options: nosniff.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
