'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

/**
 * Multi-file listing photos: drag-and-drop or browse, reorder by dragging or
 * with the arrow buttons (keyboard users get the same capability), delete, and
 * a clear cover marker — the first image is what every card shows.
 *
 * Type and size are re-checked server-side against the file's real bytes; the
 * checks here only save a round trip.
 */
export default function ImageUploader({ value = [], onChange, disabled }) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const upload = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []).filter((f) => f && f.size > 0);
      if (!files.length) return;

      const tooBig = files.filter((f) => f.size > 8 * 1024 * 1024);
      const notImage = files.filter((f) => f.type && !f.type.startsWith('image/'));
      const valid = files.filter((f) => !tooBig.includes(f) && !notImage.includes(f));

      if (notImage.length) {
        toast({
          tone: 'danger',
          title: 'Only images can be uploaded',
          description: notImage.map((f) => f.name).join(', '),
        });
      }
      if (tooBig.length) {
        toast({
          tone: 'danger',
          title: 'Some files are over 8 MB',
          description: tooBig.map((f) => f.name).join(', '),
        });
      }
      if (!valid.length) return;

      const form = new FormData();
      for (const f of valid.slice(0, 12)) form.append('files', f);

      setUploading(true);
      const res = await apiSend('/api/admin/uploads', { method: 'POST', body: form });
      setUploading(false);

      if (!res.ok) {
        return toast({ tone: 'danger', title: 'Upload failed', description: res.error });
      }
      const urls = (res.data.files || []).map((f) => f.url);
      onChange([...value, ...urls]);
      toast({
        title: `${urls.length} image${urls.length === 1 ? '' : 's'} uploaded`,
        description: res.data.failed?.length
          ? `${res.data.failed.length} file(s) were rejected as invalid images.`
          : undefined,
      });
    },
    [onChange, toast, value]
  );

  function move(from, to) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  async function remove(index) {
    const url = value[index];
    onChange(value.filter((_, i) => i !== index));
    // Only files this console wrote live under /uploads/hostels.
    if (url?.startsWith('/uploads/hostels/')) {
      await apiSend(`/api/admin/uploads?path=${encodeURIComponent(url)}`, { method: 'DELETE' });
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) upload(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-5 py-8 text-center transition-colors duration-200',
          dragOver
            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
            : 'border-border-strong bg-surface-sunken'
        )}
      >
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {uploading ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
        </span>
        <p className="text-sm font-medium text-foreground">
          {uploading ? 'Uploading…' : 'Drag photos here'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, AVIF or GIF · up to 8 MB each · 12 at a time
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>

      {value.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {value.length} photo{value.length === 1 ? '' : 's'} · the first one is the cover image
            shown on every card. Drag a tile, or use the arrow buttons, to reorder.
          </p>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((url, i) => (
              <li
                key={`${url}-${i}`}
                draggable={!disabled}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  'group relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-sunken',
                  dragIndex === i && 'opacity-50 ring-2 ring-brand-600'
                )}
              >
                <div className="relative aspect-4/3 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Listing photo ${i + 1}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  {i === 0 && (
                    <Badge tone="solid" size="sm" className="absolute left-1.5 top-1.5">
                      Cover
                    </Badge>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 grid size-6 cursor-grab place-items-center rounded-md bg-surface/90 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    <GripVertical className="size-3.5" />
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-border p-1.5">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0 || disabled}
                      aria-label={`Move photo ${i + 1} earlier`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === value.length - 1 || disabled}
                      aria-label={`Move photo ${i + 1} later`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={disabled}
                    aria-label={`Remove photo ${i + 1}`}
                    className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-35 dark:hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
