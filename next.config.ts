import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─────────────────────────────────────────────
  // Image domains
  // ─────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "https", hostname: "uploadthing.com", pathname: "/**" },
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
      { protocol: "https", hostname: "images.clerk.dev", pathname: "/**" },
      { protocol: "https", hostname: "www.gravatar.com", pathname: "/**" },
    ],
  },

  // ─────────────────────────────────────────────
  // Turbopack config (Next.js 16 default bundler)
  // Alias 'canvas' to an empty module so @react-pdf/renderer
  // can load server-side without native bindings.
  // ─────────────────────────────────────────────
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./empty-module.js", default: "./empty-module.js" },
    },
  },

  // ─────────────────────────────────────────────
  // Experimental features
  // ─────────────────────────────────────────────
  experimental: {
    inlineCss: true,
    ppr: false,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  // ─────────────────────────────────────────────
  // Server-only packages – never bundled for browser
  // ─────────────────────────────────────────────
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
