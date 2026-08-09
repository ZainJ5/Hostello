import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import { pendingReviewHostelIds } from '@/app/api/reviews/_lib/eligibility';
import AccountPage from '@/components/student/AccountPage';
import ReviewsClient from '@/components/student/ReviewsClient';
import { requireStudentUser } from '../../_lib/session';

export const metadata = { title: 'Reviews' };

export default async function ReviewsPage() {
  const { user } = await requireStudentUser('/account/reviews', 'name');
  await connectDB();

  const [reviews, pendingIds] = await Promise.all([
    // Scoped by studentId: only the caller's own reviews.
    Review.find({ studentId: user._id })
      .sort({ createdAt: -1 })
      .populate('hostelId', 'name slug city area images rating reviewCount')
      .lean(),
    // Same rule the POST endpoint enforces: a confirmed or completed enquiry
    // on a hostel they have not reviewed yet.
    pendingReviewHostelIds(user._id),
  ]);

  const reviewable = pendingIds.length
    ? await Hostel.find({ _id: { $in: pendingIds }, status: 'published' })
        .select('name slug city area')
        .lean()
    : [];

  return (
    <AccountPage
      title="Reviews"
      lead="What you told the next student. Only somebody an owner confirmed can review a hostel, which is what makes these worth reading."
      current="Reviews"
    >
      <ReviewsClient reviews={serialize(reviews)} reviewable={serialize(reviewable)} />
    </AccountPage>
  );
}
