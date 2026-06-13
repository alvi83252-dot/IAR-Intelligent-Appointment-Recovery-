import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/index\.css$/,
        contextRegExp: /@copilotkit[\\/]react-core[\\/]dist[\\/]v2$/,
      })
    );
    return config;
  },
};

export default nextConfig;
