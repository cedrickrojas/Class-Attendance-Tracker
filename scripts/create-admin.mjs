/**
 * One-time admin provisioner.
 *
 *   node scripts/create-admin.mjs
 *
 * Creates the pre-configured administrator in Firebase Authentication and writes
 * its matching `users/{uid}` profile with role "admin".
 *
 * Why a script and not the Sign Up page: the app has no code path that can
 * produce an admin, by design. This runs once, from your machine.
 *
 * Requirements before running:
 *   1. Firebase console -> Build -> Authentication -> Get started
 *   2. Sign-in method -> Email/Password -> Enable
 *   3. Firestore rules published (or still in test mode)
 *
 * The password below is the demo credential from the project brief. Change it in
 * the Firebase console for anything resembling real use.
 */
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAbUNQpiNyKUKU6ckLK7uxKWtfTJdKaamw',
  authDomain: 'class-trackerbonia.firebaseapp.com',
  projectId: 'class-trackerbonia',
  storageBucket: 'class-trackerbonia.firebasestorage.app',
  messagingSenderId: '1053722962904',
  appId: '1:1053722962904:web:b0a0b860c19a1e7140a0ad',
};

const ADMIN_EMAIL = 'admin@class-trackerbonia.com';
const ADMIN_PASSWORD = 'admin123';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  let uid;

  try {
    const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    uid = credential.user.uid;
    console.log('Created the admin auth account.');
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      // Already created on a previous run - sign in so we can repair the profile.
      const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = credential.user.uid;
      console.log('Admin auth account already existed; signed in to refresh the profile.');
    } else if (
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/configuration-not-found' ||
      // Firebase reports an unprovisioned Identity Toolkit as a network failure.
      error.code === 'auth/network-request-failed'
    ) {
      console.error('\nEmail/Password sign-in is not enabled for this project.');
      console.error('Firebase console -> Build -> Authentication -> Sign-in method ->');
      console.error('Email/Password -> Enable, then run this script again.\n');
      process.exit(1);
    } else {
      throw error;
    }
  }

  const profile = {
    uid,
    fullName: 'System Administrator',
    email: ADMIN_EMAIL,
    role: 'admin',
    studentDocId: null,
    studentId: null,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', uid), profile);

  console.log('');
  console.log('Admin ready.');
  console.log('  uid   :', uid);
  console.log('  email :', ADMIN_EMAIL);
  console.log('  role  : admin');
  console.log('');
  console.log('Sign in from the app with those credentials.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed:', error.code || '', error.message);
  process.exit(1);
});
