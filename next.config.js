/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/adminzahramobil',
  assetPrefix: '/adminzahramobil/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
