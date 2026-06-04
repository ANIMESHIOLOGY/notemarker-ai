import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/scrape": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/export/pdf": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
