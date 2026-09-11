/**
 * Firebase bootstrap (modular SDK v9+).
 *
 * These values come from:
 *   Firebase Console -> Project settings -> General -> Your apps -> Web app -> SDK setup
 *
 * They are client-side identifiers, not passwords - the Firebase web SDK sends them
 * with every request, so they are visible in any browser build. What actually keeps
 * your class data safe are the Firestore security rules (see README section 5).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAbUNQpiNyKUKU6ckLK7uxKWtfTJdKaamw',
  authDomain: 'class-trackerbonia.firebaseapp.com',
  projectId: 'class-trackerbonia',
  storageBucket: 'class-trackerbonia.firebasestorage.app',
  messagingSenderId: '1053722962904',
  appId: '1:1053722962904:web:b0a0b860c19a1e7140a0ad',
};

/**
 * True when every required key is filled in. The UI uses this to show a friendly
 * "Firebase is not configured yet" message instead of crashing.
 */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

if (!isFirebaseConfigured) {
  // Developer-facing warning only. Users never see raw Firebase errors.
  console.warn(
    '[Class Trackerbonia] Firebase is not configured. Fill in firebaseConfig in src/firebase.ts.'
  );
}

const app: FirebaseApp = initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);

/**
 * Firebase Authentication. Persistence defaults to local storage on the web and
 * to the keychain inside the iOS web view, so a signed-in user stays signed in
 * after the app is closed and reopened.
 */
export const auth: Auth = getAuth(app);

export default app;
