/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better file system handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configure PDF worker to be served from public directory
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
