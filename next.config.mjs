/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 59 of the 124 listings carry no uploaded photography and fall back to
    // the stock URLs recorded in the legacy seed data.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Payment screenshots and listing photos are read from and written to
  // public/uploads; NGINX takes over serving that path in production.
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },
};

export default nextConfig;
