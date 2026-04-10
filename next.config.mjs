import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESM Radix primitives: avoids occasional client chunk `options.factory` undefined (RSC ↔ webpack).
  transpilePackages: [
    '@radix-ui/react-accordion',
    '@radix-ui/react-collapsible',
  ],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Dev fetch tree (GET … │ GET https://… (cache skip) │ │ Cache skipped reason: …):
  // In Next 14, defining `logging.fetches` *enables* that nested fetch logging; `fullUrl` only
  // shortens URLs. Omit `logging` entirely for a clean terminal. To debug upstream fetches,
  // temporarily add: `logging: { fetches: { fullUrl: true } }`.

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  experimental: {
    // lucide-react here breaks RSC flight ↔ client webpack (undefined `options.factory`).
    optimizePackageImports: [
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-accordion',
      '@radix-ui/react-collapsible',
      'framer-motion',
      'react-markdown',
    ],
  },

  /**
   * Windows: webpack’s default filesystem cache under `.next/cache/webpack` often races with
   * hot restarts, `next.config` reloads, antivirus, or a second dev server on another port —
   * leading to ENOENT on `*.pack.gz` and client runtime `options.factory` / `.call` errors.
   * Disabling persistent cache in dev trades a bit of compile speed for stability.
   */
  webpack: (config, { dev }) => {
    if (dev && process.platform === 'win32') {
      config.cache = false
    }
    return config
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
    return [
      {
        source: '/:path*',
        headers: globalSecurity,
      },
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
