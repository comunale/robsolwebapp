import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing (Google Play Protect / browser security)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block framing entirely — no clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Only send origin in the Referer header for same-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict permissions — no camera/mic/geolocation
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Basic XSS protection for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
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
