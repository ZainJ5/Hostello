const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostello.tech';

/**
 * The public directory is meant to be crawled. Everything behind a session is
 * not, and neither is anything that only exists as a result of a query the
 * crawler would have to guess at.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/account/',
          '/dashboard/',
          '/owner/',
          '/admin/',
          '/login',
          '/signup',
          '/verify',
          '/forgot-password',
          '/reset-password',
          '/403',
          // Behind auth and residency, and personal either way.
          '/notice-board/',
          '/roommates/',
          '/students/',
          // Client state rather than content, so there is nothing to index.
          '/compare',
          // Uploaded payment screenshots are private and blocked at NGINX too.
          '/uploads/payments/',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
