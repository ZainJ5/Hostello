/**
 * Lightweight screen-space grid clustering.
 *
 * `leaflet.markercluster` is not installed and pulling it in for 124 points
 * would be a poor trade, so points are bucketed into a fixed pixel grid at the
 * *current zoom*. Leaflet's projection is absolute for a given zoom level, so
 * the grouping only ever has to be recomputed when the zoom changes — panning
 * leaves it untouched, which is what keeps the map smooth.
 *
 * O(n) with one Map allocation; ~500 points cost well under a millisecond.
 */
export function clusterPoints(points, project, cellPx) {
  const cells = new Map();

  for (const p of points) {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    const xy = project(lat, lng);
    const key = `${Math.floor(xy.x / cellPx)}:${Math.floor(xy.y / cellPx)}`;

    let cell = cells.get(key);
    if (!cell) {
      cell = { items: [], sumLat: 0, sumLng: 0, minLat: lat, maxLat: lat, minLng: lng, maxLng: lng };
      cells.set(key, cell);
    }
    cell.items.push(p);
    cell.sumLat += lat;
    cell.sumLng += lng;
    if (lat < cell.minLat) cell.minLat = lat;
    if (lat > cell.maxLat) cell.maxLat = lat;
    if (lng < cell.minLng) cell.minLng = lng;
    if (lng > cell.maxLng) cell.maxLng = lng;
  }

  const groups = [];
  for (const cell of cells.values()) {
    if (cell.items.length === 1) {
      groups.push({ kind: 'point', id: cell.items[0]._id, hostel: cell.items[0] });
      continue;
    }
    const n = cell.items.length;
    groups.push({
      kind: 'cluster',
      id: `c:${cell.items[0]._id}:${n}`,
      lat: cell.sumLat / n,
      lng: cell.sumLng / n,
      count: n,
      items: cell.items,
      // Padded so `fitBounds` on a perfectly co-located cluster still zooms.
      bounds: [
        [cell.minLat - 0.0008, cell.minLng - 0.0008],
        [cell.maxLat + 0.0008, cell.maxLng + 0.0008],
      ],
    });
  }

  // Southernmost first: Leaflet draws later markers on top, so northern pins
  // never bury the ones "in front" of them.
  groups.sort((a, b) => (b.kind === 'cluster' ? b.lat : b.hostel.lat) - (a.kind === 'cluster' ? a.lat : a.hostel.lat));
  return groups;
}

/** Bounding box of every point, used by "zoom out to all results". */
export function pointsBounds(points) {
  if (!points.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
