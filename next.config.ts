import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import packageMetadata from "./package.json";

function resolveBuildRevision(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_BUILD_REVISION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (configured) return configured.slice(0, 8);

  try {
    return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["node-ical", "pdfjs-dist"],
  env: {
    NEXT_PUBLIC_SITE_RELEASE_VERSION: packageMetadata.version,
    NEXT_PUBLIC_SITE_BUILD_REVISION: resolveBuildRevision(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.weather.gov" },
      // Vercel Blob storage — profile photos + form PDFs + media live here.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
