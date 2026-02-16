const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sql.js'],
  },
  webpack: (config, { isServer }) => {
    // Ignore test-related modules from yahoo-finance2 that reference Deno deps
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@std\/testing|@gadicc\/fetch-mock-cache)/,
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
