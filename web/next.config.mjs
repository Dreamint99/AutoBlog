/** @type {import('next').NextConfig} */
const nextConfig = {
  // Article hero images come from remote providers (Pollinations / picsum / DALL-E).
  // We render them with plain <img>, so no next/image domain config is needed.
  reactStrictMode: true,
  // Inline SITE_ID at build time so src/sites/registry.ts keeps only this site's design (and CSS) in the bundle.
  env: { SITE_ID: process.env.SITE_ID || "" },
  // Crawlers (Google included) request /favicon.ico directly; serve the per-site
  // generated icon there instead of a 404.
  async rewrites() {
    return { beforeFiles: [{ source: "/favicon.ico", destination: "/icon" }] };
  },
};
export default nextConfig;
