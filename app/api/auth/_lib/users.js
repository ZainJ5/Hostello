/**
 * Where each role lands after signing in. Kept beside the API so the server's
 * `redirect` hint and the client's fallback never drift apart.
 */
export const HOME_FOR_ROLE = {
  student: '/dashboard',
  owner: '/owner',
  admin: '/admin',
};

export function homeForRole(role) {
  return HOME_FOR_ROLE[role] || '/dashboard';
}

/**
 * The only shape of a user that ever leaves the server.
 *
 * `passwordHash` carries `select: false`, so it is normally absent already —
 * this builds an allow-list rather than deleting keys, so a field added to the
 * model later cannot leak by default.
 */
export function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    status: user.status,
    phone: user.phone || '',
    university: user.university || '',
    city: user.city || '',
    gender: user.gender || '',
    avatar: user.avatar || '',
    businessName: user.businessName || '',
    savedHostels: (user.savedHostels || []).map(String),
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
  };
}

/** Message shown when a suspended account tries to sign in. */
export const SUSPENDED_MESSAGE =
  'This account has been suspended. Email support@hostello.tech to appeal.';
