/**
 * How much of a student's name the community shows.
 *
 * First name plus a surname initial, everywhere, for everybody. Two reasons,
 * and the second is the one that decided it.
 *
 * A full name is not needed to make an answer trustworthy: the answer is
 * trusted because the person lives there, which the product verified, not
 * because of what they are called.
 *
 * And most of this directory is women's hostels. A page that pairs a full
 * name with a building, a room number and the times somebody walks to campus
 * is a personal safety problem, not a privacy nicety. The minimisation is
 * applied on the server, in the shape functions, so a route cannot leak a full
 * name by forgetting to call a component.
 */
export function publicName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'A student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Up to two letters for the avatar circle. */
export function avatarInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
