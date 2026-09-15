import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Expose les bindings Cloudflare (D1, etc.) pendant `next dev` via miniflare.
// En production, le contexte est fourni par le worker OpenNext.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
