import { redirect } from 'next/navigation';

/**
 * There is no read-only listing detail screen in the console, because an owner
 * looking at their own listing always wants to change something. Send them to
 * the editor, which enforces ownership itself.
 */
export default async function ListingIndexPage({ params }) {
  const { id } = await params;
  redirect(`/owner/listings/${id}/edit`);
}
