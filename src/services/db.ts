/**
 * All Firestore reads/writes live here so the Vue components stay focused on UI.
 *
 * Two collections are used:
 *   students   -> { studentId, studentName, courseSection, createdAt }
 *   attendance -> { studentDocId, studentId, studentName, date, status, remarks, createdAt }
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase';
import type {
  AttendanceInput,
  AttendanceRecord,
  AttendanceStatus,
  Student,
  StudentInput,
} from '@/types';

const STUDENTS = 'students';
const ATTENDANCE = 'attendance';

/**
 * Error type that always carries a message safe to display to a teacher.
 * Raw Firebase errors are logged to the console instead.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Translates a Firebase/network failure into plain language. */
function toFriendlyError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;

  console.error('[Class Trackerbonia] Firestore error:', error);

  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'permission-denied':
      return new AppError('You do not have permission to perform this action.');
    case 'unavailable':
    case 'deadline-exceeded':
      return new AppError('Cannot reach the database. Please check your internet connection.');
    case 'not-found':
      return new AppError('That record no longer exists. It may have been deleted.');
    case 'failed-precondition':
      return new AppError('The database is not ready yet. Please try again in a moment.');
    case 'resource-exhausted':
      return new AppError('The database is busy right now. Please try again shortly.');
    default:
      return new AppError(fallback);
  }
}

/** Guards every call so a missing config gives a clear message instead of a crash. */
function assertConfigured(): void {
  if (!isFirebaseConfigured) {
    throw new AppError('Firebase is not set up yet. Add your Firebase keys in src/firebase.ts.');
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/* -------------------------------------------------------------------------- */
/* Students                                                                    */
/* -------------------------------------------------------------------------- */

/** Returns every student, sorted by name (A-Z). */
export async function getStudents(): Promise<Student[]> {
  assertConfigured();
  try {
    const snapshot = await getDocs(collection(db, STUDENTS));
    const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Student);
    return students.sort((a, b) =>
      a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' })
    );
  } catch (error) {
    throw toFriendlyError(error, 'Could not load students. Please try again.');
  }
}

/** Returns a single student, or null when the document is gone. */
export async function getStudent(id: string): Promise<Student | null> {
  assertConfigured();
  try {
    const snapshot = await getDoc(doc(db, STUDENTS, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Student;
  } catch (error) {
    throw toFriendlyError(error, 'Could not load this student. Please try again.');
  }
}

/**
 * True when another student already uses this student ID.
 * `ignoreDocId` lets the edit form skip the student being edited.
 */
export async function studentIdExists(studentId: string, ignoreDocId?: string): Promise<boolean> {
  assertConfigured();
  try {
    const q = query(collection(db, STUDENTS), where('studentId', '==', studentId.trim()));
    const snapshot = await getDocs(q);
    return snapshot.docs.some((d) => d.id !== ignoreDocId);
  } catch (error) {
    throw toFriendlyError(error, 'Could not check the student ID. Please try again.');
  }
}

const COUNTERS = 'counters';
const STUDENT_COUNTER = 'students';
const ID_PREFIX = 'STU-';

/** Highest number already used by a "STU-NNNN" id, or 0. */
function highestIssued(ids: string[]): number {
  return ids.reduce((max, id) => {
    const match = /^STU-(\d+)$/.exec((id ?? '').trim());
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
}

/**
 * Issues the next student ID: STU-0001, STU-0002, ...
 *
 * The counter lives in its own document and is bumped inside a transaction, so
 * two admins adding students at the same moment cannot be handed the same
 * number. On first use it seeds from the ids already issued, so an existing
 * STU- id is never reused.
 */
export async function issueStudentId(): Promise<string> {
  assertConfigured();

  const counterRef = doc(db, COUNTERS, STUDENT_COUNTER);

  // Seeding needs a query, and a transaction cannot run one - so do it first.
  let seed = 0;
  const existingCounter = await getDoc(counterRef);
  if (!existingCounter.exists()) {
    const snapshot = await getDocs(collection(db, STUDENTS));
    seed = highestIssued(snapshot.docs.map((d) => (d.data() as Student).studentId));
  }

  try {
    const next = await runTransaction(db, async (tx) => {
      const current = await tx.get(counterRef);
      const value = current.exists() ? Number(current.data().value ?? 0) : seed;
      const bumped = value + 1;
      tx.set(counterRef, { value: bumped });
      return bumped;
    });

    return `${ID_PREFIX}${String(next).padStart(4, '0')}`;
  } catch (error) {
    throw toFriendlyError(error, 'Could not generate a student ID. Please try again.');
  }
}

function validateStudent(input: StudentInput): StudentInput {
  const studentName = input.studentName?.trim() ?? '';
  const courseSection = input.courseSection?.trim() ?? '';

  if (!studentName) throw new AppError('Student name is required.');
  if (studentName.length < 2) throw new AppError('Please enter the full student name.');
  if (!courseSection) throw new AppError('Course / Section is required.');

  return { studentName, courseSection };
}

/**
 * Creates a student. The ID is generated here - never supplied by a form - so it
 * is unique by construction and there is no duplicate to reject.
 *
 * Both entry points land here: the admin's "Add Student", and a student signing
 * up for themselves.
 */
export async function addStudent(input: StudentInput): Promise<Student> {
  assertConfigured();
  const clean = validateStudent(input);
  const studentId = await issueStudentId();

  try {
    const createdAt = nowIso();
    const payload = { ...clean, studentId, createdAt };
    const ref = await addDoc(collection(db, STUDENTS), payload);
    return { id: ref.id, ...payload };
  } catch (error) {
    throw toFriendlyError(error, 'Could not save the student. Please try again.');
  }
}

/**
 * Updates a student's name and section, and keeps the copy of the name inside
 * their attendance records in sync. The student ID is permanent and is never
 * touched here.
 */
export async function updateStudent(id: string, input: StudentInput): Promise<void> {
  assertConfigured();
  const clean = validateStudent(input);

  try {
    await updateDoc(doc(db, STUDENTS, id), { ...clean });

    const linked = await getDocs(query(collection(db, ATTENDANCE), where('studentDocId', '==', id)));
    if (!linked.empty) {
      const batch = writeBatch(db);
      linked.docs.forEach((d) => batch.update(d.ref, { studentName: clean.studentName }));
      await batch.commit();
    }
  } catch (error) {
    throw toFriendlyError(error, 'Could not update the student. Please try again.');
  }
}

/** Deletes a student together with all of their attendance records. */
export async function deleteStudent(id: string): Promise<void> {
  assertConfigured();
  try {
    const linked = await getDocs(query(collection(db, ATTENDANCE), where('studentDocId', '==', id)));

    const batch = writeBatch(db);
    linked.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, STUDENTS, id));
    await batch.commit();
  } catch (error) {
    throw toFriendlyError(error, 'Could not delete the student. Please try again.');
  }
}

/* -------------------------------------------------------------------------- */
/* Attendance                                                                  */
/* -------------------------------------------------------------------------- */

function sortRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  // Newest date first; within the same date, the newest entry first.
  return records.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** Returns every attendance record, newest first. */
export async function getAttendance(): Promise<AttendanceRecord[]> {
  assertConfigured();
  try {
    const snapshot = await getDocs(collection(db, ATTENDANCE));
    return sortRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord));
  } catch (error) {
    throw toFriendlyError(error, 'Could not load attendance records. Please try again.');
  }
}

/** Returns the attendance history of one student, newest first. */
export async function getAttendanceForStudent(studentDocId: string): Promise<AttendanceRecord[]> {
  assertConfigured();
  try {
    const q = query(collection(db, ATTENDANCE), where('studentDocId', '==', studentDocId));
    const snapshot = await getDocs(q);
    return sortRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord));
  } catch (error) {
    throw toFriendlyError(error, 'Could not load the attendance history. Please try again.');
  }
}

function validateAttendance(input: AttendanceInput): AttendanceInput {
  const studentDocId = input.studentDocId?.trim() ?? '';
  const date = input.date?.trim() ?? '';
  const status = input.status;

  if (!studentDocId || !input.studentName?.trim()) throw new AppError('Please choose a student.');
  if (!date) throw new AppError('Please choose a date.');
  if (!status) throw new AppError('Please choose an attendance status.');

  const validStatus: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];
  if (!validStatus.includes(status)) throw new AppError('Please choose a valid attendance status.');

  return {
    studentDocId,
    studentId: input.studentId?.trim() ?? '',
    studentName: input.studentName.trim(),
    date,
    status,
    remarks: input.remarks?.trim() ?? '',
  };
}

/**
 * True when this student already has a record on this date.
 * `ignoreDocId` lets the edit form skip the record being edited.
 */
async function attendanceExists(
  studentDocId: string,
  date: string,
  ignoreDocId?: string
): Promise<boolean> {
  const q = query(collection(db, ATTENDANCE), where('studentDocId', '==', studentDocId));
  const snapshot = await getDocs(q);
  return snapshot.docs.some(
    (d) => d.id !== ignoreDocId && (d.data() as AttendanceRecord).date === date
  );
}

/** Creates an attendance record. One record per student per day. */
export async function addAttendance(input: AttendanceInput): Promise<AttendanceRecord> {
  assertConfigured();
  const clean = validateAttendance(input);

  try {
    if (await attendanceExists(clean.studentDocId, clean.date)) {
      throw new AppError(
        clean.studentName +
          ' already has attendance recorded for this date. Edit it from the Records tab.'
      );
    }

    const createdAt = nowIso();
    const ref = await addDoc(collection(db, ATTENDANCE), { ...clean, createdAt });
    return { id: ref.id, ...clean, createdAt };
  } catch (error) {
    throw toFriendlyError(error, 'Could not save the attendance record. Please try again.');
  }
}

/** Updates an existing attendance record. */
export async function updateAttendance(id: string, input: AttendanceInput): Promise<void> {
  assertConfigured();
  const clean = validateAttendance(input);

  try {
    if (await attendanceExists(clean.studentDocId, clean.date, id)) {
      throw new AppError(clean.studentName + ' already has another record on this date.');
    }

    await updateDoc(doc(db, ATTENDANCE, id), { ...clean });
  } catch (error) {
    throw toFriendlyError(error, 'Could not update the attendance record. Please try again.');
  }
}

/** Deletes one attendance record. */
export async function deleteAttendance(id: string): Promise<void> {
  assertConfigured();
  try {
    await deleteDoc(doc(db, ATTENDANCE, id));
  } catch (error) {
    throw toFriendlyError(error, 'Could not delete the attendance record. Please try again.');
  }
}
