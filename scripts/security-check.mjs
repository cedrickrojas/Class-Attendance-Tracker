/**
 * Security probe: tries the things a student must NOT be able to do, by talking
 * to Firestore directly - exactly how someone would bypass the hidden buttons.
 *
 *   npm run security-check -- <studentEmail> <studentPassword>
 *
 * Every PASS means Firestore refused the operation.
 *
 * SAFETY -- read this before changing anything below.
 * If the rules are not published, these writes really happen. The run therefore
 * starts with a single reversible probe against the caller's own profile and
 * ABORTS the moment something is allowed, so it never reaches the checks that
 * would delete or rewrite real records.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAbUNQpiNyKUKU6ckLK7uxKWtfTJdKaamw',
  authDomain: 'class-trackerbonia.firebaseapp.com',
  projectId: 'class-trackerbonia',
  storageBucket: 'class-trackerbonia.firebasestorage.app',
  messagingSenderId: '1053722962904',
  appId: '1:1053722962904:web:b0a0b860c19a1e7140a0ad',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: npm run security-check -- <studentEmail> <studentPassword>');
  process.exit(1);
}

let passed = 0;
let failed = 0;

/** Stops the run rather than damaging real data to prove a point. */
function abort(label) {
  const line = '--------------------------------------------------------------';
  console.error('');
  console.error(line);
  console.error('ABORTED: Firestore allowed an operation it should have refused.');
  console.error(`         (${label})`);
  console.error('');
  console.error('That means the security rules are not published, so the');
  console.error('remaining checks would really modify and delete your data.');
  console.error('Publish firestore.rules in the Firebase console, then re-run.');
  console.error(line);
  process.exit(1);
}

/** Expects the operation to be REFUSED. Anything allowed stops the whole run. */
async function mustFail(label, fn) {
  try {
    await fn();
  } catch (error) {
    const code = error.code || '';
    if (code === 'permission-denied') {
      console.log(`  [PASS] ${label}`);
      passed++;
      return;
    }
    console.log(`  [FAIL] ${label}`);
    console.log(`         unexpected error: ${code} ${error.message}`);
    failed++;
    return;
  }

  console.log(`  [FAIL] ${label}`);
  console.log('         the operation was ALLOWED');
  failed++;
  abort(label);
}

/** Expects the operation to SUCCEED. */
async function mustWork(label, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${label}`);
    passed++;
  } catch (error) {
    console.log(`  [FAIL] ${label}`);
    console.log(`         refused: ${error.code} ${error.message}`);
    failed++;
  }
}

const credential = await signInWithEmailAndPassword(auth, email, password);
const uid = credential.user.uid;
const me = (await getDoc(doc(db, 'users', uid))).data();

console.log(`Signed in as ${email}`);
console.log(`  role=${me.role}  studentDocId=${me.studentDocId}`);
console.log('');

if (me.role !== 'student') {
  console.error('This probe must be run with a STUDENT account.');
  process.exit(1);
}

const students = await getDocs(collection(db, 'students'));
const other = students.docs.find((d) => d.id !== me.studentDocId);
if (!other) {
  console.log('Need at least two students to test cross-student access.');
  process.exit(1);
}

/* ---------------------------------------------------------------------- */
/* The canary. Reversible, and only touches this account's own profile.    */
/* ---------------------------------------------------------------------- */
console.log('TEST 9 - role escalation');
await mustFail('student cannot set their own role to admin', () =>
  updateDoc(doc(db, 'users', uid), { role: 'admin' })
);
await mustFail('student cannot rewrite their profile as admin', () =>
  setDoc(doc(db, 'users', uid), { ...me, role: 'admin' })
);
await mustFail('student cannot repoint studentDocId at another student', () =>
  updateDoc(doc(db, 'users', uid), { studentDocId: other.id })
);

console.log('');
console.log('TEST 10 - attendance for another student');
await mustFail('student cannot create attendance for someone else', () =>
  addDoc(collection(db, 'attendance'), {
    studentDocId: other.id,
    studentId: other.data().studentId,
    studentName: other.data().studentName,
    date: '2026-01-01',
    status: 'Present',
    remarks: 'security probe',
    createdAt: new Date().toISOString(),
  })
);

const foreign = (await getDocs(collection(db, 'attendance'))).docs.find(
  (d) => d.data().studentDocId === other.id
);
if (foreign) {
  await mustFail("student cannot edit another student's record", () =>
    updateDoc(doc(db, 'attendance', foreign.id), { status: 'Absent' })
  );
  await mustFail("student cannot delete another student's record", () =>
    deleteDoc(doc(db, 'attendance', foreign.id))
  );
}

console.log('');
console.log('TEST 8b - students collection is read-only for students');
await mustFail('student cannot add a student', () =>
  addDoc(collection(db, 'students'), {
    studentId: 'PROBE-001',
    studentName: 'Injected',
    courseSection: 'X',
    createdAt: new Date().toISOString(),
  })
);
await mustFail('student cannot edit a student', () =>
  updateDoc(doc(db, 'students', other.id), { studentName: 'Renamed by student' })
);
await mustFail('student cannot delete a student', () => deleteDoc(doc(db, 'students', other.id)));

/* ---------------------------------------------------------------------- */
/* What a student SHOULD still be able to do.                             */
/* ---------------------------------------------------------------------- */
console.log('');
console.log('Allowed behaviour (these must still work)');
await mustWork('student can read the class list', () => getDocs(collection(db, 'students')));
await mustWork('student can read their own profile', () => getDoc(doc(db, 'users', uid)));

let ownRecordId = null;
await mustWork('student can record their OWN attendance', async () => {
  const ref = await addDoc(collection(db, 'attendance'), {
    studentDocId: me.studentDocId,
    studentId: me.studentId,
    studentName: me.fullName,
    date: '2026-01-02',
    status: 'Present',
    remarks: 'security probe - own record',
    createdAt: new Date().toISOString(),
  });
  ownRecordId = ref.id;
});

if (ownRecordId) {
  await mustWork('student can remove their own record', () =>
    deleteDoc(doc(db, 'attendance', ownRecordId))
  );
}

await signOut(auth);
console.log('');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
