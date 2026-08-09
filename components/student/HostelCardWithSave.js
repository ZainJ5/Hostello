'use client';

import HostelCard from '@/components/public/HostelCard';
import SaveButton from './SaveButton';

/**
 * `HostelCard` owns its heart's appearance but not its persistence. It keeps
 * local state and hands the caller an `onSave` callback. Inside the account
 * area we already know which listings are saved and we want the toggle to hit
 * the API, so the card's own control is switched off and a real `SaveButton`
 * is laid over the same corner (`z-20`, above the card's stretched link).
 */
export default function HostelCardWithSave({ hostel, initialSaved = false, priority = false }) {
  return (
    <div className="relative">
      <SaveButton
        hostelId={String(hostel._id)}
        initialSaved={initialSaved}
        name={hostel.name}
        className="absolute top-3 right-3 z-20"
      />
      <HostelCard hostel={hostel} priority={priority} showSave={false} />
    </div>
  );
}
