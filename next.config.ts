import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { webpack }) => {
    const shimPath = path.resolve(__dirname, "src/styles/copilotkit-shim.css");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\/index\.css$/, (resource: {
        context: string;
        request: string;
      }) => {
        if (resource.context.includes(`${path.sep}@copilotkit${path.sep}react-core${path.sep}`)) {
          resource.request = shimPath;
        }
      })
    );
    return config;
  },
};

export default nextConfig;
