// OpenNext → Cloudflare Workers adapter config.
// Default config: SSR pages run in the Worker, static assets served from the assets binding.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
