/** @type {import('next').NextConfig} */
const nextConfig = {
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
