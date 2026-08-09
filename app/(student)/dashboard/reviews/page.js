import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import { pendingReviewHostelIds } from '@/app/api/reviews/_lib/eligibility';
import ReviewsClient from '@/components/student/ReviewsClient';
import { requireStudentUser } from '../../_lib/session';

export const metadata = { title: 'My reviews' };

export default async function ReviewsPage() {
  const { user } = await requireStudentUser('/dashboard/reviews', 'name');
  await connectDB();

  const [reviews, pendingIds] = await Promise.all([
    // Scoped by studentId: only the caller's own reviews.
    Review.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .populate('hostelId', 'name slug city area images rating reviewCount')
      .lean(),
    // Same rule the POST endpoint enforces: a confirmed or completed booking
    // on a hostel they haven't reviewed yet.
    pendingReviewHostelIds(user._id),
  ]);

  const reviewable = pendingIds.length
    ? await Hostel.find({ _id: { $in: pendingIds }, status: 'published' })
        .select('name slug city area images')
        .lean()
    : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h2 text-foreground">My reviews</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Reviews you have written, and the hostels you are eligible to review. Only
          students with a confirmed or completed booking can review a hostel, and that
          is what makes these worth reading.
        </p>
      </header>

      <ReviewsClient reviews={serialize(reviews)} reviewable={serialize(reviewable)} />
    </div>
  );
}
