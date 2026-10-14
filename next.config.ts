import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lunar-javascript is CommonJS; keep it out of the server bundle.
  serverExternalPackages: ["lunar-javascript"],
};

export default nextConfig;
