import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import Button from '@/components/ds/Button';
import Pagination from '@/components/ds/Pagination';
import ContentPage from '@/components/content/PageShell';
import { FinePrint, Paragraph, Section } from '@/components/content/Blocks';
import RatingSummary from '@/components/reviews/RatingSummary';
import ReviewList from '@/components/reviews/ReviewList';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export function generateMetadata() {
  return {
    title: 'Student reviews',
    description:
      'Every review written on Hostello, newest first. Reviews come from students who enquired and stayed, an owner can reply once and can never delete one, and nothing here is written by us.',
    alternates: { canonical: '/reviews' },
  };
}

/**
 * Everything this page renders is counted from Review documents.
 *
 * It never reads the legacy `rating` and `reviewCount` on a listing. Half the
 * directory carries those from an import while the Review collection is empty,
 * so totalling them would put a four figure review count above a list with
 * nothing in it. What the legacy numbers are and why they are still on a
 * listing is said in words further down the page instead.
 */
async function loadReviews(page) {
  try {
    await connectDB();

    const where = { status: 'published' };

    const [total, rows, spread, listingsWithLegacy] = await Promise.all([
      Review.countDocuments(where),
      Review.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate('hostelId', 'name slug city')
        .lean(),
      Review.aggregate([
        { $match: where },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
      Hostel.countDocuments({ status: 'published', rating: { $gte: 1 } }),
    ]);

    const distribution = {};
    let weighted = 0;
    for (const row of spread) {
      const band = Number(row._id);
      distribution[band] = row.count;
      weighted += band * row.count;
    }

    return {
      total,
      reviews: serialize(rows),
      distribution,
      average: total > 0 ? weighted / total : 0,
      listingsWithLegacy,
    };
  } catch (error) {
    console.error('[reviews] could not load reviews:', error?.message || error);
    return { total: 0, reviews: [], distribution: {}, average: 0, listingsWithLegacy: 0 };
  }
}

export default async function ReviewsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);

  const { total, reviews, distribution, average, listingsWithLegacy } = await loadReviews(page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ContentPage
      trail={[
        { href: '/', label: 'Home' },
        { label: 'Reviews' },
      ]}
      title={
        total > 0
          ? `${total} ${total === 1 ? 'review' : 'reviews'} from students on Hostello`
          : 'Student reviews'
      }
      intro="Every review here was written by somebody with a Hostello account who enquired and stayed. An owner can reply once and can never delete one, and we do not write any of them."
    >
      {total > 0 ? (
        <RatingSummary
          average={average}
          total={total}
          distribution={distribution}
          note="Counted from reviews written on Hostello. Nothing carried over from anywhere else is included."
        />
      ) : null}

      {/* Two different empties, and they must not share copy. An empty
          collection means nobody has written one. An empty page of a
          non-empty collection means the page number is past the end, and
          telling that reader there are no reviews would be a lie the URL
          itself disproves. */}
      {total > 0 && reviews.length === 0 ? (
        <ReviewList
          reviews={[]}
          emptyTitle="Nothing on this page"
          emptyBody={`There ${total === 1 ? 'is' : 'are'} ${total} ${total === 1 ? 'review' : 'reviews'}, but page ${page} is past the end of the list.`}
          emptyAction={<Button href="/reviews">Back to the first page</Button>}
        />
      ) : (
        <ReviewList
          reviews={reviews}
          showHostel
          emptyTitle="No reviews have been written yet"
          emptyBody="Hostello only lets a student review a hostel once they hold a confirmed or completed enquiry there, and nobody has reached that point yet. Rather than fill this page with samples, it stays empty until the first real one arrives."
          emptyAction={<Button href="/hostels">Browse hostels</Button>}
        />
      )}

      {total > PAGE_SIZE ? (
        <Pagination
          page={Math.min(page, pages)}
          pages={pages}
          total={total}
          perPage={PAGE_SIZE}
          hrefFor={(p) => (p === 1 ? '/reviews' : `/reviews?page=${p}`)}
        />
      ) : null}

      {listingsWithLegacy > 0 ? (
        <Section title="Why some listings show a score anyway">
          <Paragraph>
            {listingsWithLegacy} listings in the directory carry a rating from before Hostello kept
            reviews on the site. Those numbers came across with the listing and its description
            quotes them, so removing them would make the listing contradict itself. They are not
            reviews, nothing on this page counts them, and there is nothing to read behind one.
          </Paragraph>
          <FinePrint>
            A listing says so on its own page too, so a score with an empty review list is never
            left to look like a missing list.
          </FinePrint>
        </Section>
      ) : null}

      <Section title="How reviewing works here">
        <Paragraph>
          You can review a hostel once you hold a confirmed or completed enquiry with it, and you
          get one review per hostel, which you can edit later. An owner can reply once. Neither the
          owner nor Hostello can delete a review, and we remove one only if it names a private
          individual or contains a threat.
        </Paragraph>
        <Paragraph>
          Students can flag a review that is abusive or fake. A review that collects three flags is
          hidden from the site and from the listing average while a person reads it.
        </Paragraph>
      </Section>
    </ContentPage>
  );
}
