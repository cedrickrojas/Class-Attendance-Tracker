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
/** True until Firebase has reported the restored session once. */
const initializing = ref(true);
/** True while a sign-in / sign-up / sign-out request is in flight. */
const busy = ref(false);

let started = false;
let resolveReady: () => void;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/** Called once from main.ts, before the app mounts. */
export function initAuth(): Promise<void> {
  if (started) return ready;
  started = true;

  if (!isFirebaseConfigured) {
    initializing.value = false;
    resolveReady();
    return ready;
  }

  api.watchAuthState(async (nextUser) => {
    user.value = nextUser;

    if (!nextUser) {
      profile.value = null;
    } else {
      try {
        profile.value = await api.getUserProfile(nextUser.uid);
      } catch {
        // Offline or rules problem - treat as "no profile" rather than crashing.
        profile.value = null;
      }
    }

    initializing.value = false;
    resolveReady();
  });

  return ready;
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
