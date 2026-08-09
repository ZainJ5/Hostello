'use server';

import { z } from 'zod';
import { createSession, getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { normalizePhone } from '@/lib/utils';
import User from '@/models/User';

/**
 * Profile and password writes live here as Server Actions rather than as REST
 * endpoints: `app/api/auth/**` belongs to the auth stream, and a student
 * editing their own row needs no public API surface. Both actions re-read the
 * session themselves and scope every write by `session.userId`, so a form post
 * can only ever touch the caller's own account.
 */

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80, 'That name is too long'),
  phone: z.string().trim().max(20, 'That number looks too long').default(''),
  university: z.string().trim().max(80).default(''),
  city: z.string().trim().max(60).default(''),
  gender: z.enum(['Male', 'Female', 'Other', ''], 'Choose an option').default(''),
  // The picture is uploaded through /api/account/avatar, which writes the file
  // and returns its path. This field only carries that path back, so it accepts
  // nothing else: the input is hidden, and a tampered value would otherwise let
  // somebody point their avatar at any URL on the internet.
  avatar: z
    .string()
    .trim()
    .max(200)
    .default('')
    .refine(
      (v) => !v || /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/.test(v),
      'Upload a picture instead of setting an address'
    ),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(200, 'That password is too long'),
    confirmPassword: z.string().min(1, 'Repeat your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Those passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Choose a password you have not used here before',
    path: ['newPassword'],
  });

function invalid(err) {
  return {
    ok: false,
    error: 'Please check the highlighted fields',
    fieldErrors: Object.fromEntries(
      Object.entries(err.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]])
    ),
  };
}

/** Save the student's own profile. */
export async function updateProfileAction(prevState, formData) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Your session expired. Sign in again.' };

  const parsed = profileSchema.safeParse({
    name: formData.get('name') ?? '',
    phone: formData.get('phone') ?? '',
    university: formData.get('university') ?? '',
    city: formData.get('city') ?? '',
    gender: formData.get('gender') ?? '',
    avatar: formData.get('avatar') ?? '',
  });
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  await connectDB();
  const updated = await User.findByIdAndUpdate(
    session.userId,
    {
      $set: {
        name: data.name,
        phone: data.phone ? normalizePhone(data.phone) : '',
        university: data.university,
        city: data.city,
        gender: data.gender,
        avatar: data.avatar,
      },
    },
    { new: true, runValidators: true }
  )
    .select('name email role')
    .lean();

  if (!updated) return { ok: false, error: 'We could not find your account' };

  // The name is baked into the session JWT, so re-issue it. Otherwise the
  // public navbar would keep greeting them by their old name until sign-in.
  if (updated.name !== session.name) {
    await createSession({
      userId: session.userId,
      role: updated.role,
      email: updated.email,
      name: updated.name,
    });
  }

  return { ok: true, message: 'Profile saved' };
}

/** Change the student's own password, proving the current one first. */
export async function changePasswordAction(prevState, formData) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Your session expired. Sign in again.' };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword') ?? '',
    newPassword: formData.get('newPassword') ?? '',
    confirmPassword: formData.get('confirmPassword') ?? '',
  });
  if (!parsed.success) return invalid(parsed.error);

  await connectDB();
  // `passwordHash` is `select: false` on the model.
  const user = await User.findById(session.userId).select('+passwordHash');
  if (!user) return { ok: false, error: 'We could not find your account' };

  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) {
    return {
      ok: false,
      error: 'Please check the highlighted fields',
      fieldErrors: { currentPassword: 'That is not your current password' },
    };
  }

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  await user.save();

  return { ok: true, message: 'Password changed' };
}
