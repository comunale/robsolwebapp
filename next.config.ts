import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing (Google Play Protect / browser security)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block framing entirely — no clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Only send origin in the Referer header for same-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera required by the coupon-scan feature; all other sensitive APIs blocked
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Basic XSS protection for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Security headers on every route
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
      // Service worker must never be served from a stale browser cache.
      // Browsers already cap SW cache-max-age at 24h, but be explicit.
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  reactCompiler: true,
  // Polling-based watch on Windows — native FS events (ReadDirectoryChangesW) can silently
  // drop events, causing HMR WebSocket to stall and requiring manual browser refreshes.
  // 500 ms polling gives fast rebuilds without CPU overhead.
  watchOptions: {
    pollIntervalMs: 500,
  },
  experimental: {
    // Receipt images can be up to 10 MB; the default 1 MB limit
    // causes a "Server Components render error" when the base64
    // payload is passed to the scanCouponImage server action.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upmsxjqcdypayxkoaekl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
