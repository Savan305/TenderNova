import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: '200gb'
    }
  },
  webpack: (config) => {
    config.resolve.modules = [...(config.resolve.modules ?? []), path.resolve(process.cwd(), 'node_modules')];
    return config;
  }
};

export default nextConfig;
