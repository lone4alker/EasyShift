/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router uses a different approach for internationalization
  // No i18n config needed here for client-side i18n
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
