import { z } from 'zod';

/**
 * Zod schemas for every auth endpoint.
 *
 * `handler` in @/lib/api turns a ZodError into `422 { fieldErrors }`, so every
 * message here is written to be shown verbatim under the field it belongs to —
 * no "Invalid input" leaking into the UI.
 */

/** Roles a visitor may pick for themselves. `admin` is never self-assignable. */
export const SIGNUP_ROLES = ['student', 'owner'];

/** Purposes the generic /api/auth/verify endpoint will act on. */
export const VERIFIABLE_PURPOSES = ['signup', 'reset', 'delete-account'];

export const CODE_LENGTH = 6;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Trim and lowercase before validating, otherwise a stray leading space or a
// capitalised domain reads as an invalid address. User.email is `lowercase`
// too, so this keeps lookups and writes on the same key.
const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('Enter a valid email address')
      .max(160, 'That email address is too long')
  );

// Policy: 8+ characters with at least one letter and one number. Kept as a
// single refinement so a weak password produces one actionable message rather
// than a stack of them.
const passwordField = z
  .string({ error: 'Password is required' })
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer`)
  .refine(
    (v) => /[A-Za-z]/.test(v) && /\d/.test(v),
    'Include at least one letter and one number'
  );

const nameField = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Enter your full name')
  .max(80, 'Use 80 characters or fewer');

const codeField = z
  .string({ error: 'Enter the 6-digit code' })
  .trim()
  .regex(/^\d{6}$/, `Enter the ${CODE_LENGTH}-digit code from your email`);

const roleField = z.enum(SIGNUP_ROLES, {
  error: 'Choose whether you are a student or a hostel owner',
});

const purposeField = z.enum(VERIFIABLE_PURPOSES, {
  error: 'Unknown verification purpose',
});

export const signupSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  role: roleField,
});

// Login deliberately skips the strength policy: an account created before a
// policy change must still be able to sign in and then change its password.
export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: 'Password is required' }).min(1, 'Enter your password'),
});

export const verifySchema = z.object({
  email: emailField,
  code: codeField,
  purpose: purposeField,
});

export const resendSchema = z.object({
  email: emailField,
  purpose: purposeField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  email: emailField,
  code: codeField,
  password: passwordField,
});

/** DELETE /api/auth/delete-account — the email comes from the session. */
export const deleteAccountSchema = z.object({
  code: codeField,
});
