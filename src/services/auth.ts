/**
 * Authentication and user profiles.
 *
 * Kept separate from the UI for the same reason `db.ts` is: components should
 * never touch Firebase directly, and every failure should reach the screen as a
 * sentence a teacher or student can act on.
 *
 * Roles: sign-up here ALWAYS writes `role: 'student'`. There is no code path in
 * the app that can create an admin - that account is provisioned once, out of
 * band, and the Firestore rules reject any attempt to escalate.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/firebase';
import { addStudent, AppError } from '@/services/db';
import type { SignupInput, UserProfile } from '@/types';

const USERS = 'users';

/** Turns a Firebase auth failure into something worth showing a person. */
function toFriendlyAuthError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;

  console.error('[Class Trackerbonia] Auth error:', error);

  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new AppError('Invalid email or password.');
    case 'auth/invalid-email':
      return new AppError('Please enter a valid email address.');
    case 'auth/email-already-in-use':
      return new AppError('This email is already registered.');
    case 'auth/weak-password':
      return new AppError('Password must be at least 6 characters.');
    case 'auth/too-many-requests':
      return new AppError('Too many attempts. Please wait a moment and try again.');
    case 'auth/user-disabled':
      return new AppError('This account has been disabled. Please contact your administrator.');
    case 'auth/network-request-failed':
      return new AppError('Unable to connect. Please check your internet connection and try again.');
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return new AppError(
        'Sign-in is not enabled for this project yet. Enable Email/Password in the Firebase console.'
      );
    case 'permission-denied':
      return new AppError('You do not have permission to perform this action.');
    default:
      return new AppError(fallback);
  }
}

function assertConfigured(): void {
  if (!isFirebaseConfigured) {
    throw new AppError('Firebase is not set up yet. Add your Firebase keys in src/firebase.ts.');
  }
}

/* -------------------------------------------------------------------------- */
/* Profiles                                                                    */
/* -------------------------------------------------------------------------- */

/** Reads `users/{uid}`. Returns null when the account has no profile yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  assertConfigured();
  try {
    const snapshot = await getDoc(doc(db, USERS, uid));
    if (!snapshot.exists()) return null;
    return snapshot.data() as UserProfile;
  } catch (error) {
    throw toFriendlyAuthError(error, 'Could not load your account. Please try again.');
  }
}

/* -------------------------------------------------------------------------- */
/* Sign in / out                                                               */
/* -------------------------------------------------------------------------- */

export async function login(email: string, password: string): Promise<UserProfile> {
  assertConfigured();

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new AppError('Email address is required.');
  if (!password) throw new AppError('Password is required.');

  let user: User;
  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    user = credential.user;
  } catch (error) {
    throw toFriendlyAuthError(error, 'Could not sign you in. Please try again.');
  }

  const profile = await getUserProfile(user.uid);
  if (!profile) {
    // Signed in, but nothing links this account to a role - refuse rather than guess.
    await signOut(auth).catch(() => undefined);
    throw new AppError('This account has no profile yet. Please contact your administrator.');
  }
  return profile;
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw toFriendlyAuthError(error, 'Could not log you out. Please try again.');
  }
}

export async function resetPassword(email: string): Promise<void> {
  assertConfigured();

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new AppError('Enter your email address first.');

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // Don't confirm whether an address is registered.
    if (code === 'auth/user-not-found') return;
    throw toFriendlyAuthError(error, 'Could not send the reset email. Please try again.');
  }
}

/* -------------------------------------------------------------------------- */
/* Sign up - students only                                                     */
/* -------------------------------------------------------------------------- */

function validateSignup(input: SignupInput): SignupInput {
  const fullName = input.fullName?.trim() ?? '';
  const courseSection = input.courseSection?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const password = input.password ?? '';

  if (!fullName) throw new AppError('Full name is required.');
  if (fullName.length < 2) throw new AppError('Please enter your full name.');
  if (!courseSection) throw new AppError('Course / Section is required.');
  if (!email) throw new AppError('Email address is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Please enter a valid email address.');
  }
  if (!password) throw new AppError('Password is required.');
  if (password.length < 6) throw new AppError('Password must be at least 6 characters.');

  return { fullName, courseSection, email, password };
}

/**
 * Creates a STUDENT account.
 *
 * The student ID is ISSUED BY THE APP, never typed or chosen: the auth account
 * is created first, then a student record with the next ID in sequence, then the
 * profile that links the two. The role is hard-coded here and enforced again by
 * the Firestore rules - the form supplies neither.
 */
export async function signupStudent(input: SignupInput): Promise<UserProfile> {
  assertConfigured();
  const clean = validateSignup(input);

  // 1. Create the auth account. Writing the student record needs a signed-in
  //    user, so this has to come first.
  let user: User;
  try {
    const credential = await createUserWithEmailAndPassword(auth, clean.email, clean.password);
    user = credential.user;
  } catch (error) {
    throw toFriendlyAuthError(error, 'Could not create your account. Please try again.');
  }

  // 2. Create their student record - the same call the admin's form uses, so the
  //    ID sequence is shared and can never collide.
  let student;
  try {
    student = await addStudent({
      studentName: clean.fullName,
      courseSection: clean.courseSection,
    });
  } catch (error) {
    // No student record means no usable account - don't leave a half-made one.
    await signOut(auth).catch(() => undefined);
    throw error;
  }

  // 3. Write the profile, always as a student.
  const profile: UserProfile = {
    uid: user.uid,
    fullName: clean.fullName,
    email: clean.email,
    role: 'student',
    studentDocId: student.id,
    studentId: student.studentId,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, USERS, user.uid), profile);
  } catch (error) {
    /*
     * The profile is the last step, and without it the account is unusable: the
     * router treats "no profile" as signed out, and login() refuses it.
     *
     * Remove the auth account rather than just signing out, so the same email can
     * be used to try again. The student record from step 2 is left behind - a
     * signing-up user is not allowed to delete students, by design. It shows up
     * in the class list with no linked account and an admin can remove it.
     */
    await deleteUser(user).catch(() => signOut(auth).catch(() => undefined));
    console.error(
      '[Class Trackerbonia] Sign-up failed after creating student',
      student.studentId,
      '- an admin may need to remove that entry.'
    );
    throw toFriendlyAuthError(error, 'Could not finish setting up your account.');
  }

  return profile;
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

/** Subscribes to sign-in state. Returns the unsubscribe function. */
export function watchAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
