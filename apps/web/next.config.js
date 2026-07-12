const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone' removed - @netlify/plugin-nextjs handles build output
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    resolveAlias: {
      // Force Turbopack to resolve from root node_modules
      tailwindcss: path.resolve(__dirname, '../../node_modules/tailwindcss'),
      'tailwindcss-animate': path.resolve(__dirname, '../../node_modules/tailwindcss-animate'),
      autoprefixer: path.resolve(__dirname, '../../node_modules/autoprefixer'),
      postcss: path.resolve(__dirname, '../../node_modules/postcss'),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    optimizeCss: true,
  },
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Mark optional dependencies as externals to prevent build-time errors
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ioredis': 'commonjs ioredis',
        'bullmq': 'commonjs bullmq',
        'file-type': 'commonjs file-type',
      });
    }
    return config;
  },
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // swcMinify: true, // Deprecated in Next.js 16 - minification is automatic
  // Security headers (handled by Netlify)
  async headers() {
    const staticCache =
      process.env.NODE_ENV === 'production'
        ? 'public, max-age=31536000, immutable'
        : 'no-store, must-revalidate';

    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: staticCache,
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

