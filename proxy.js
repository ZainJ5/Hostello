import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

/**
 * Route guard. Next 16 renamed `middleware` to `proxy`; the function must be
 * named `proxy` and runs on the Node.js runtime (the `edge` runtime and the
 * `runtime` segment option are not available here, and setting one throws).
 *
 * This is an optimistic check: it verifies the session JWT's signature and
 * expiry, nothing more. It keeps signed-out visitors from ever seeing a
 * dashboard shell, but it is not the authorisation boundary. Every route
 * handler and page behind these prefixes still calls `requireRole`, because a
 * matcher change or a new route would otherwise silently remove all protection.
 *
 * Order matters: the longest prefix has to be tested first, so `/owner/x`
 * never falls through to a broader rule.
 */
const RULES = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/owner', roles: ['owner', 'admin'] },
  // Empty roles means "any signed-in user".
  // The student area moved from /dashboard to /account. The old prefix stays
  // so the guard still applies while the permanent redirects are followed.
  { prefix: '/account', roles: [] },
  { prefix: '/dashboard', roles: [] },
];

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const rule = RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Drop any query the guarded page carried, then record where to return to
    // so the user lands back where they were aiming.
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (rule.roles.length && !rule.roles.includes(session.role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Positive matchers, so the proxy never runs for `/api/**` (including
 * `/api/auth/*`), `_next/static`, `_next/image`, `/uploads/*` or anything else
 * in `public/`. Values must be literals, because Next reads them at build time.
 */
export const config = {
  matcher: ['/account/:path*', '/dashboard/:path*', '/owner/:path*', '/admin/:path*'],
};
