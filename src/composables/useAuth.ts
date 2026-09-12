/**
 * Centralized authentication state.
 *
 * One module-level store, shared by every screen and by the router guard. The
 * `ready` promise is the important part: the guard must wait for Firebase to
 * restore the session before deciding to redirect, otherwise a returning user is
 * bounced to /login for a moment on every cold start.
 */
import { computed, ref } from 'vue';
import type { User } from 'firebase/auth';
import * as api from '@/services/auth';
import { isFirebaseConfigured } from '@/firebase';
import type { SignupInput, UserProfile } from '@/types';

const user = ref<User | null>(null);
const profile = ref<UserProfile | null>(null);

/* -------------------------------------------------------------------------- */
/* Cached profile                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The last profile we successfully read, kept on disk.
 *
 * This exists purely for start-up speed. Reading `users/{uid}` is a network
 * round-trip, and blocking the first paint on it is what made the iOS app feel
 * slow to open. With a cached copy the app can render immediately and verify
 * against the server a moment later.
 */
const PROFILE_KEY = 'classtrackerbonia.profile';

function readCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as UserProfile;
    // Never trust a profile that belongs to a different account.
    return cached?.uid === uid ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(next: UserProfile | null): void {
  try {
    if (next) localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Storage full or disabled - the app still works, just starts slower.
  }
}
/** True until Firebase has reported the restored session once. */
const initializing = ref(true);
/** True while a sign-in / sign-up / sign-out request is in flight. */
const busy = ref(false);

let started = false;
let resolveReady: () => void;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/**
 * Nothing may hold the first paint hostage. Firebase normally reports the
 * restored session in a few milliseconds, but if it ever stalls the app opens
 * signed-out rather than sitting on a blank screen.
 */
const READY_TIMEOUT_MS = 2500;

/** Called once from main.ts, before the app mounts. */
export function initAuth(): Promise<void> {
  if (started) return ready;
  started = true;

  if (!isFirebaseConfigured) {
    initializing.value = false;
    resolveReady();
    return ready;
  }

  const bailout = setTimeout(() => {
    initializing.value = false;
    resolveReady();
  }, READY_TIMEOUT_MS);

  api.watchAuthState((nextUser) => {
    clearTimeout(bailout);
    user.value = nextUser;

    if (!nextUser) {
      profile.value = null;
      writeCachedProfile(null);
      initializing.value = false;
      resolveReady();
      return;
    }

    // Firebase has already restored the session from the keychain at this point,
    // so the only thing left is the profile document. Serve the cached copy and
    // release the router straight away; the refresh below runs off the critical
    // path and corrects the state if anything changed server-side.
    const cached = readCachedProfile(nextUser.uid);
    if (cached) {
      profile.value = cached;
      initializing.value = false;
      resolveReady();
      void refreshProfile(nextUser.uid);
      return;
    }

    // First sign-in on this device - there is nothing to show yet, so this one
    // fetch has to be awaited.
    void refreshProfile(nextUser.uid).finally(() => {
      initializing.value = false;
      resolveReady();
    });
  });

  return ready;
}

/**
 * Re-reads `users/{uid}` and reconciles the cache.
 *
 * Failures are deliberately non-destructive: a dropped connection should not
 * sign a user out of an app whose data is already on disk. Only a definite
 * "this profile no longer exists" clears the session.
 */
async function refreshProfile(uid: string): Promise<void> {
  let fresh: UserProfile | null;
  try {
    fresh = await api.getUserProfile(uid);
  } catch {
    // Offline or a transient error - keep whatever we are already showing.
    return;
  }

  // Ignore a late response for an account that has since signed out or changed.
  if (user.value?.uid !== uid) return;

  profile.value = fresh;
  writeCachedProfile(fresh);
}

export function useAuth() {
  const isAuthenticated = computed(() => user.value !== null && profile.value !== null);
  const role = computed(() => profile.value?.role ?? null);
  const isAdmin = computed(() => role.value === 'admin');
  const isStudent = computed(() => role.value === 'student');

  /** The student record this account may act for. Null for admins. */
  const linkedStudentDocId = computed(() => profile.value?.studentDocId ?? null);

  async function login(email: string, password: string): Promise<UserProfile> {
    busy.value = true;
    try {
      const next = await api.login(email, password);
      profile.value = next;
      writeCachedProfile(next);
      return next;
    } finally {
      busy.value = false;
    }
  }

  async function signup(input: SignupInput): Promise<UserProfile> {
    busy.value = true;
    try {
      const next = await api.signupStudent(input);
      profile.value = next;
      writeCachedProfile(next);
      return next;
    } finally {
      busy.value = false;
    }
  }

  async function logout(): Promise<void> {
    busy.value = true;
    try {
      await api.logout();
      profile.value = null;
      user.value = null;
      writeCachedProfile(null);
    } finally {
      busy.value = false;
    }
  }

  async function resetPassword(email: string): Promise<void> {
    busy.value = true;
    try {
      await api.resetPassword(email);
    } finally {
      busy.value = false;
    }
  }

  return {
    // state
    user,
    profile,
    role,
    isAuthenticated,
    isAdmin,
    isStudent,
    linkedStudentDocId,
    loading: initializing,
    busy,
    ready,
    // actions
    login,
    signup,
    logout,
    resetPassword,
  };
}
