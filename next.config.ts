import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
