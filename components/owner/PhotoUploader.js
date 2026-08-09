'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  ImagePlus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import { ConfirmDialog } from './Modal';
import { apiSend } from './api-client';

const MAX_PHOTOS = 15;
const MAX_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

/**
 * Photo manager for a listing: multi-file upload, drag-and-drop, reorder, set
 * cover, delete.
 *
 * The cover photo is simply position 1. "Set as cover" moves the photo to the
 * front rather than storing a separate flag, so the two controls can never
 * disagree. Reordering is available from the keyboard as well as by dragging,
 * because drag-and-drop on its own is not operable without a pointer.
 */
export default function PhotoUploader({ listingId, images, onChange, error }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [localError, setLocalError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const canAdd = images.length < MAX_PHOTOS;

  async function upload(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setLocalError('');

    if (!listingId) {
      setLocalError('Finish the first step so we have a draft to attach photos to.');
      return;
    }
    if (images.length + files.length > MAX_PHOTOS) {
      setLocalError(`You can upload ${MAX_PHOTOS} photos in total, and ${images.length} are already here.`);
      return;
    }

    // Cheap client-side screen so an obviously wrong file never leaves the
    // browser. The server re-checks type, size and magic bytes regardless.
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setLocalError(`“${tooBig.name}” is larger than ${MAX_MB} MB.`);
      return;
    }
    const notImage = files.find((f) => f.type && !ACCEPT.includes(f.type));
    if (notImage) {
      setLocalError(`“${notImage.name}” is not a JPG, PNG, WebP, AVIF or GIF image.`);
      return;
    }

    const form = new FormData();
    for (const file of files) form.append('files', file);

    setUploading(true);
    try {
      const data = await apiSend(`/api/owner/listings/${listingId}/images`, { form });
      onChange(data.images);
      toast.success(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded.`);
    } catch (err) {
      setLocalError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function persistOrder(next) {
    const previous = images;
    onChange(next);
    try {
      await apiSend(`/api/owner/listings/${listingId}/images`, {
        method: 'PATCH',
        body: { images: next },
      });
    } catch (err) {
      onChange(previous);
      toast.error(err.message);
    }
  }

  async function remove(image) {
    const previous = images;
    onChange(images.filter((i) => i !== image));
    try {
      const data = await apiSend(`/api/owner/listings/${listingId}/images`, {
        method: 'DELETE',
        body: { image },
      });
      onChange(data.images);
      toast.success('Photo removed.');
    } catch (err) {
      onChange(previous);
      toast.error(err.message);
    }
  }

  function move(from, to) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (canAdd) upload(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-[var(--radius-card)] border-2 border-dashed p-6 text-center transition-colors duration-200',
          dragActive
            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40'
            : 'border-border-strong bg-surface-sunken'
        )}
      >
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-6" aria-hidden="true" />}
        </span>
        <p className="text-sm font-semibold text-foreground">
          {uploading ? 'Uploading…' : 'Drag photos here'}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          JPG, PNG, WebP, AVIF or GIF, up to {MAX_MB} MB each. The first photo becomes the cover,
          so make it the one that sells the room.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => upload(e.target.files)}
          disabled={!canAdd || uploading}
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={!canAdd || uploading}
          loading={uploading}
        >
          <Upload className="size-4" aria-hidden="true" />
          Choose photos
        </Button>
        <p className="tabular mt-2 text-xs text-muted-foreground">
          {images.length} of {MAX_PHOTOS} used
        </p>
      </div>

      {(localError || error) && <Alert tone="danger">{localError || error}</Alert>}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-muted',
                dragIndex === index && 'opacity-50'
              )}
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={image}
                  alt={index === 0 ? 'Cover photo' : `Photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>

              {index === 0 && (
                <Badge tone="solid" size="sm" className="absolute top-2 left-2">
                  Cover
                </Badge>
              )}
              <span
                className="absolute top-2 right-2 cursor-grab rounded-md bg-slate-950/60 p-1 text-white/80"
                aria-hidden="true"
                title="Drag to reorder"
              >
                <GripVertical className="size-3.5" />
              </span>

              <div className="flex items-center gap-1 border-t border-border bg-surface p-1.5">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === images.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 0)}
                  disabled={index === 0}
                  aria-label={`Make photo ${index + 1} the cover`}
                  title="Set as cover"
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Star className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ image, index })}
                  aria-label={`Delete photo ${index + 1}`}
                  className="ml-auto grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-danger/15"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => remove(pendingDelete.image)}
        title={`Delete photo ${(pendingDelete?.index ?? 0) + 1}?`}
        confirmLabel="Delete photo"
      >
        The file is removed from the server and cannot be recovered. You would need to upload it
        again.
        {pendingDelete?.index === 0 && images.length > 1 && (
          <span className="mt-2 block font-medium text-foreground">
            This is your cover photo, so the next photo takes its place.
          </span>
        )}
      </ConfirmDialog>
    </div>
  );
}
