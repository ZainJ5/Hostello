import Hostel from '@/models/Hostel';
import HostelCard from '@/components/ds/HostelCard';
import { cn, serialize } from '@/lib/utils';
import { SECTION_TITLE } from '@/components/public/type';
import { CARD_PROJECTION } from './query';
import { cardCampus } from './campus-distance';

/**
 * Four more listings a student comparing this one would want to see: the same
 * city or a shared campus, never the listing they are already reading.
 *
 * DIVERGENCE, RECORDED. The brief calls for `card/hostel/compact`. There is no
 * compact card in `components/ds`, and the design file's only listing card is
 * card/hostel/search 18:13, so these are the same card the browse grid uses at
 * four across. A second card design would need adding to the shared set
 * centrally rather than invented here.
 */
export async function loadSimilar(hostel, limit = 4) {
  return Hostel.find(
    {
      status: 'published',
      _id: { $ne: hostel._id },
      $or: [
        { city: hostel.city },
        ...(hostel.universities?.length ? [{ universities: { $in: hostel.universities } }] : []),
      ],
    },
    CARD_PROJECTION
  )
    .sort({ featured: -1, rating: -1, reviewCount: -1, _id: 1 })
    .limit(limit)
    .lean();
}

export default function SimilarHostels({ hostels, className }) {
  const rows = serialize(hostels || []);
  if (!rows.length) return null;

  return (
    <section aria-labelledby="similar-h" className={className}>
      <h2 id="similar-h" className={cn(SECTION_TITLE, 'text-ds-ink')}>
        More hostels like this
      </h2>
      <p className="ds-body-m mt-2 text-ds-ink-muted">
        Same city or the same campus. Worth reading before you decide.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((h) => (
          <li key={h._id} className="min-w-px">
            <HostelCard hostel={h} campus={cardCampus(h)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
