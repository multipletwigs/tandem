import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/defi"],
  // Heavy Node-only protocol SDKs stay external to the server bundle.
  serverExternalPackages: [
    "@exponent-labs/exponent-sdk",
    "@kamino-finance/klend-sdk",
    "@jup-ag/lend",
    "@jup-ag/lend-read",
    "@coral-xyz/anchor",
  ],
}

export default nextConfig
