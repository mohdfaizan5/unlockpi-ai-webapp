import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Next.js <Image> optimization from any external hostname
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // wildcard — any HTTPS host
      },
      {
        protocol: "http",
        hostname: "**", // wildcard — any HTTP host (dev/intranet use)
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          {
            // Allow images from any origin (plain <img> tags, markdown, etc.)
            key: "Content-Security-Policy",
            value: "img-src * data: blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
