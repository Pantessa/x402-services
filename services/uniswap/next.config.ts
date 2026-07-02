import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service-kit is a workspace source package (TS), so let Next transpile it.
  transpilePackages: ["@yeetful/x402-service-kit"],
};

export default nextConfig;
