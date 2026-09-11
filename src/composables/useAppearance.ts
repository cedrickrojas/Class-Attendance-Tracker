/**
 * Light / Dark / System Default appearance.
 *
 * Ionic switches to its dark palette when the `ion-palette-dark` class is on
 * <html>. "System Default" follows the iPhone's own appearance setting live.
 */
import { ref, readonly } from 'vue';

export type AppearanceMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'classtrackerbonia.appearance';
const DARK_CLASS = 'ion-palette-dark';

const mode = ref<AppearanceMode>(readStoredMode());
const isDark = ref<boolean>(false);

let mediaQuery: MediaQueryList | null = null;

function readStoredMode(): AppearanceMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private mode / storage disabled - fall back to the system setting.
  }
  return 'system';
}

function applyMode(): void {
  const prefersDark = mediaQuery?.matches ?? false;
  const dark = mode.value === 'dark' || (mode.value === 'system' && prefersDark);

  isDark.value = dark;
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  // Keeps the iOS status bar text readable over the app background.
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/** Called once from main.ts before the app mounts. */
export function initAppearance(): void {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', applyMode);
  applyMode();
}

export function useAppearance() {
  function setMode(next: AppearanceMode): void {
    mode.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures - the choice still applies for this session.
    }
    applyMode();
  }

  return { mode: readonly(mode), isDark: readonly(isDark), setMode };
}
