'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { cn } from '@/lib/utils';

const SUB_SCORES = [
  ['cleanliness', 'Cleanliness'],
  ['food', 'Food'],
  ['security', 'Security'],
  ['location', 'Location'],
  ['valueForMoney', 'Value for money'],
];

const EMPTY = {
  hostelId: '',
  studentName: '',
  rating: 0,
  cleanliness: 0,
  food: 0,
  security: 0,
  location: 0,
  valueForMoney: 0,
  title: '',
  comment: '',
  status: 'published',
  date: '',
};

function Stars({ label, value, onChange, required, error }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </p>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(value === n && !required ? 0 : n)}
            className="grid size-8 cursor-pointer place-items-center rounded-md hover:bg-muted"
          >
            <Star
              className={cn(
                'size-5',
                n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function AddReviewButton({ listings }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [find, setFind] = useState('');

  const options = useMemo(() => {
    const q = find.trim().toLowerCase();
    const list = q ? listings.filter((l) => l.label.toLowerCase().includes(q)) : listings;
    // Keep the chosen listing in the dropdown even when the search hides it.
    const chosen = listings.find((l) => l.value === form.hostelId);
    return chosen && !list.includes(chosen) ? [chosen, ...list] : list;
  }, [find, listings, form.hostelId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function close() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    setSaving(true);
    const body = { ...form };
    for (const [k] of SUB_SCORES) if (!body[k]) body[k] = null;
    const res = await apiSend('/api/admin/reviews', { method: 'POST', body });
    setSaving(false);
    if (!res.ok) {
      setErrors(
        Object.fromEntries(Object.entries(res.fieldErrors || {}).map(([k, v]) => [k, v?.[0]]))
      );
      return toast({ tone: 'danger', title: 'Could not add review', description: res.error });
    }
    const name = listings.find((l) => l.value === form.hostelId)?.label || 'The listing';
    toast({
      title: 'Review added',
      description: `${name} now shows ${res.data.rating} from ${res.data.reviewCount} reviews.`,
    });
    setForm(EMPTY);
    setErrors({});
    setFind('');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add review
      </Button>

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="Add a review"
        description="For feedback a student gave you on WhatsApp, a call or a visit. It counts toward the listing rating like any other review."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              Add review
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Find listing"
              placeholder="Type a hostel name or city"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
            <Select
              label="Listing"
              value={form.hostelId}
              onChange={(e) => set('hostelId', e.target.value)}
              error={errors.hostelId}
              required
            >
              <option value="">
                {options.length ? `Pick one of ${options.length}` : 'No listing matches'}
              </option>
              {options.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Input
              label="Reviewer name"
              placeholder="Ali R."
              value={form.studentName}
              onChange={(e) => set('studentName', e.target.value)}
              error={errors.studentName}
              required
            />
            <Input
              label="Review date"
              type="date"
              hint="Leave empty to use today"
              max={new Date().toISOString().slice(0, 10)}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
          </div>

          <Stars
            label="Overall rating"
            required
            value={form.rating}
            onChange={(v) => set('rating', v)}
            error={errors.rating}
          />

          <div className="grid gap-2 sm:grid-cols-3">
            {SUB_SCORES.map(([k, label]) => (
              <Stars key={k} label={label} value={form[k]} onChange={(v) => set(k, v)} />
            ))}
          </div>

          <Input
            label="Title"
            placeholder="Clean rooms, food could be better"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            maxLength={120}
          />
          <Textarea
            label="Review"
            rows={5}
            value={form.comment}
            onChange={(e) => set('comment', e.target.value)}
            error={errors.comment}
            hint={`${form.comment.length}/2000`}
            maxLength={2000}
            required
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="published">Published</option>
            <option value="flagged">Flagged for a second look</option>
            <option value="removed">Removed (saved, not counted)</option>
          </Select>
        </div>
      </Modal>
    </>
  );
}
