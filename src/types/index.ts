/** Shared data shapes used across the app. */

/* -------------------------------------------------------------------------- */
/* Accounts and roles                                                          */
/* -------------------------------------------------------------------------- */

/** Exactly two roles. `admin` is pre-provisioned and never created by sign-up. */
export type UserRole = 'admin' | 'student';

/**
 * Profile stored at `users/{uid}` - the document id IS the Firebase Auth UID.
 *
 * `studentDocId` links a student account to its `students/{id}` record. That link
 * is what lets a student record their own attendance and nobody else's; the
 * Firestore rules check it server-side, never the value the client sends.
 */
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  /** null for admins. */
  studentDocId: string | null;
  /** The school-facing ID, null for admins. */
  studentId: string | null;
  createdAt: string;
}

/**
 * What the sign-up form collects. Neither the role nor the student ID appears
 * here - the app assigns both, so a student can never pick either one.
 */
export interface SignupInput {
  fullName: string;
  courseSection: string;
  email: string;
  password: string;
}


export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

export interface Student {
  /** Firestore document id (not the teacher-facing student number). */
  id: string;
  /** School/teacher facing id, e.g. "2024-0001". */
  studentId: string;
  studentName: string;
  courseSection: string;
  createdAt: string;
}

/**
 * What the admin form supplies. `studentId` is NOT here - the app generates it
 * on create and it is permanent afterwards.
 */
export interface StudentInput {
  studentName: string;
  courseSection: string;
}

export interface AttendanceRecord {
  id: string;
  /** Firestore document id of the student this record belongs to. */
  studentDocId: string;
  studentId: string;
  studentName: string;
  /** ISO calendar date, "YYYY-MM-DD". Stored as a string so it sorts and filters easily. */
  date: string;
  status: AttendanceStatus;
  remarks: string;
  createdAt: string;
}

export type AttendanceInput = Omit<AttendanceRecord, 'id' | 'createdAt'>;

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Present / total * 100, rounded to a whole number. 0 when there are no records. */
  rate: number;
}
