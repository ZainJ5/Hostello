/**
 * Distance vocabulary for listings. Figma listing/campus-distance 75:59.
 *
 * The product measures straight line kilometres and nothing else. It has no
 * routing, no isochrones and no walk time, and the design file records a
 * correction on exactly this point: an earlier draft of the listing card read
 * "31 min walk to FJWU", which was a nicer decision input and an invented one.
 * Minutes are never rendered.
 *
 * The band is deliberately coarse, because a straight line figure does not
 * support a finer claim than this.
 */

export const DISTANCE_NOTE =
  'Straight line from the listing to the main campus gate. Walking and road distance are both longer, and Hostello does not measure either yet.';

/**
 * Returns walkable, a short ride or a commute.
 *
 * The 6 km boundary is taken from the design file, where 5.9 km reads as a
 * short ride and 6.1 km reads as a commute. The 2.5 km boundary carries over
 * from the band the live site already used, since the file has no sample
 * below 4.6 km to read it from.
 */
export function distanceBand(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 2.5) return 'walkable';
  if (n <= 6) return 'a short ride';
  return 'a commute';
}

/** One decimal, so a column of figures compares digit under digit. */
export function formatKm(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toFixed(1)} km`;
}
