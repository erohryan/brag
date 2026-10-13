/** @type {import('next').NextConfig} */
const nextConfig = {
  // NEXT_DIST_DIR lets a second instance (e.g. a test build) use its own build
  // folder instead of clobbering the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // We never use next/image — media is served by our own /api/files route.
  // Disabling the optimizer removes the /_next/image endpoint (and its known
  // AVIF RCE advisory) from the attack surface entirely.
  images: { unoptimized: true },
  experimental: {
    // Allow large document uploads through Server Actions / route handlers.
    serverActions: { bodySizeLimit: '100mb' },
  },
};

export default nextConfig;
