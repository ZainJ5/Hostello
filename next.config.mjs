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

  /**
   * The student account area moved from /dashboard to /account, and the
   * booking sub-route became /enquiries because "enquiry" is the word a
   * student sees everywhere now. The Mongo collection, the models and the API
   * routes are still `booking`; only the URL changed.
   *
   * Permanent, because the old paths are in students' history, in bookmarks
   * and in every `?next=` a signed-out visitor was ever redirected with.
   * Listed longest first so no path falls through to a broader rule, and
   * query strings carry over untouched, which is what keeps a link like
   * /dashboard/bookings?status=pending working.
   */
  async redirects() {
    return [
      // The listing's own booking form became /enquire for the same reason.
      {
        source: '/hostels/:slug/book',
        destination: '/hostels/:slug/enquire',
        permanent: true,
      },
      { source: '/dashboard/bookings', destination: '/account/enquiries', permanent: true },
      { source: '/dashboard/profile', destination: '/account/profile', permanent: true },
      { source: '/dashboard/reviews', destination: '/account/reviews', permanent: true },
      { source: '/dashboard/saved', destination: '/account/saved', permanent: true },
      { source: '/dashboard', destination: '/account', permanent: true },
    ];
  },
};

export default nextConfig;
