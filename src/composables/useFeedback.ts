/**
 * Thin wrappers around Ionic's toast and alert controllers so every screen
 * shows feedback the same way.
 */
import { alertController, toastController } from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';

type ToastKind = 'success' | 'error' | 'info';

const ICONS: Record<ToastKind, string> = {
  success: checkmarkCircleOutline,
  error: alertCircleOutline,
  info: informationCircleOutline,
};

const COLORS: Record<ToastKind, string> = {
  success: 'success',
  error: 'danger',
  info: 'medium',
};

export function useFeedback() {
  /** Shows a short message at the top of the screen (below the notch). */
  async function showToast(message: string, kind: ToastKind = 'success'): Promise<void> {
    const toast = await toastController.create({
      message,
      duration: kind === 'error' ? 2800 : 2000,
      position: 'top',
      color: COLORS[kind],
      icon: ICONS[kind],
      cssClass: 'ct-toast',
      swipeGesture: 'vertical',
    });
    await toast.present();
  }

  /** Pulls a user-friendly message out of any thrown value. */
  function messageOf(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  /** Shows an error toast for a thrown value. */
  async function showError(error: unknown, fallback?: string): Promise<void> {
    await showToast(messageOf(error, fallback), 'error');
  }

  /**
   * iOS-style confirmation alert. Resolves true when the user confirms.
   */
  async function confirm(options: {
    header: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await alertController.create({
        header: options.header,
        message: options.message,
        buttons: [
          {
            text: options.cancelText ?? 'Cancel',
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: options.confirmText ?? 'Confirm',
            role: options.destructive ? 'destructive' : 'confirm',
            handler: () => resolve(true),
          },
        ],
      });
      await alert.present();
      // Covers dismissal by tapping the backdrop or pressing Escape.
      await alert.onDidDismiss();
      resolve(false);
    });
  }

  return { showToast, showError, messageOf, confirm };
}
