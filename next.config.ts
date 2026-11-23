import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // allow a few phone photos per listing
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
