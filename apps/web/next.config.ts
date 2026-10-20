import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@communityhub/shared'],
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
