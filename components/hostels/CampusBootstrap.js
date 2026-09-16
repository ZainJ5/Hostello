'use client';

import { applyCampusRows } from './campus-registry';

/**
 * Applies the admin-managed universities in the browser before any page
 * component renders, so dropdowns, map pins and distance tables match the
 * server render.
 */
export default function CampusBootstrap({ rows, children }) {
  applyCampusRows(rows);
  return children;
}
