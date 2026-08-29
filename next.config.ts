import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "35mb",
  },

  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
