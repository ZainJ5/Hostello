import DsHostelCard from '@/components/ds/HostelCard';
import { cardCampus } from '@/components/hostels/campus-distance';

/**
 * COMPATIBILITY SHIM. There is one listing card on the student site and it is
 * `components/ds/HostelCard`, built on card/hostel/search 18:13.
 *
 * This module stays because the account area imports it from two places that
 * sit outside this rebuild, and pointing them at the design system component
 * here is better than leaving a second card design alive in the codebase.
 *
 * `showSave` is accepted and ignored. The 2026 card carries no heart, no star
 * and no Featured badge: saving lives on the listing page and in the account
 * area, which is exactly where both remaining callers already put their own
 * save control.
 */
export default function HostelCard({ hostel, priority = false, className }) {
  return (
    <DsHostelCard
      hostel={hostel}
      campus={cardCampus(hostel)}
      priority={priority}
      className={className}
    />
  );
}
