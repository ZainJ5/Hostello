import Badge from '@/components/ds/Badge';

/**
 * Where a listing's details came from.
 *
 * This is not the verified badge and is not a quality mark. Verified answers
 * "has Hostello checked this place". This answers "who typed this in", which
 * is the question a student actually has when the rent looks too good, and it
 * is the honest thing to show on a directory that was seeded from public
 * listings rather than filled in by owners one at a time.
 */
const LABELS = {
  owner: {
    label: 'Kept by the owner',
    title: 'The hostel owner has an account here and maintains this listing.',
  },
  import: {
    label: "From the hostel's public listing",
    title:
      'Details were taken from the hostel’s own public listing. Nobody from Hostello has been to this one, so check the rent and the room when you call.',
  },
  admin: {
    label: 'Added by Hostello',
    title: 'Entered by the Hostello team from what the hostel published.',
  },
};

export default function SourceBadge({ source, className }) {
  const entry = LABELS[source];
  if (!entry) return null;
  return (
    <Badge variant="outline" className={className} title={entry.title}>
      {entry.label}
    </Badge>
  );
}
