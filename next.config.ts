import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
