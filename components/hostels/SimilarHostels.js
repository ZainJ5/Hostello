import Hostel from '@/models/Hostel';
import HostelCard from '@/components/public/HostelCard';
import { serialize } from '@/lib/utils';
import { CARD_PROJECTION } from './query';

/**
 * Four more listings a student comparing this one would want to see: same city
 * or a shared university, never the listing they're already reading. Ranked by
 * featured then rating, so the alternatives are ones we'd stand behind.
 */
export async function loadSimilar(hostel, limit = 4) {
  return Hostel.find(
    {
      status: 'published',
      _id: { $ne: hostel._id },
      $or: [
        { city: hostel.city },
        ...(hostel.universities?.length
          ? [{ universities: { $in: hostel.universities } }]
          : []),
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
    <section aria-labelledby="similar-heading" className={className}>
      <h2 id="similar-heading" className="text-h3 text-foreground">
        More hostels like this
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Same city or the same campus. Worth a look before you commit.
      </p>

      <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((h) => (
          <li key={h._id} className="min-w-0">
            <HostelCard hostel={h} showSave />
          </li>
        ))}
      </ul>
    </section>
  );
}
