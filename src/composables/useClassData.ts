/**
 * A tiny shared store.
 *
 * Every tab reads from the same reactive arrays, so adding a student on the
 * Students tab immediately updates the Home dashboard and the Attendance form.
 * Firestore access itself stays in `src/services/db.ts`.
 */
import { computed, ref } from 'vue';
import * as api from '@/services/db';
import type {
  AttendanceInput,
  AttendanceRecord,
  AttendanceSummary,
  Student,
  StudentInput,
} from '@/types';
import { todayIso } from '@/utils/date';

const students = ref<Student[]>([]);
const attendance = ref<AttendanceRecord[]>([]);

const loadingStudents = ref(false);
const loadingAttendance = ref(false);
/** Set when the last load failed, so screens can show a retry message. */
const loadError = ref('');

let loadedOnce = false;

/** Counts records by status and returns the attendance rate. */
export function summarize(records: AttendanceRecord[]): AttendanceSummary {
  const summary: AttendanceSummary = { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };

  for (const record of records) {
    summary.total += 1;
    if (record.status === 'Present') summary.present += 1;
    else if (record.status === 'Absent') summary.absent += 1;
    else if (record.status === 'Late') summary.late += 1;
    else if (record.status === 'Excused') summary.excused += 1;
  }

  // Attendance Rate = Present / Total Attendance Records x 100
  summary.rate = summary.total === 0 ? 0 : Math.round((summary.present / summary.total) * 100);
  return summary;
}

export function useClassData() {
  /** Reloads the student list from Firestore. */
  async function refreshStudents(): Promise<void> {
    loadingStudents.value = true;
    try {
      students.value = await api.getStudents();
      loadError.value = '';
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Could not load data.';
      throw error;
    } finally {
      loadingStudents.value = false;
    }
  }

  /** Reloads all attendance records from Firestore. */
  async function refreshAttendance(): Promise<void> {
    loadingAttendance.value = true;
    try {
      attendance.value = await api.getAttendance();
      loadError.value = '';
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Could not load data.';
      throw error;
    } finally {
      loadingAttendance.value = false;
    }
  }

  /** Loads both collections at the same time. */
  async function refreshAll(): Promise<void> {
    loadedOnce = true;
    await Promise.all([refreshStudents(), refreshAttendance()]);
  }

  /** Loads data the first time a screen needs it. */
  async function ensureLoaded(): Promise<void> {
    if (loadedOnce) return;
    await refreshAll();
  }

  /* ---------------------------------------------------------------------- */
  /* Student actions                                                        */
  /* ---------------------------------------------------------------------- */

  async function createStudent(input: StudentInput): Promise<Student> {
    const created = await api.addStudent(input);
    students.value = [...students.value, created].sort((a, b) =>
      a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' })
    );
    return created;
  }

  async function editStudent(id: string, input: StudentInput): Promise<void> {
    await api.updateStudent(id, input);
    await Promise.all([refreshStudents(), refreshAttendance()]);
  }

  async function removeStudent(id: string): Promise<void> {
    await api.deleteStudent(id);
    students.value = students.value.filter((s) => s.id !== id);
    attendance.value = attendance.value.filter((r) => r.studentDocId !== id);
  }

  /* ---------------------------------------------------------------------- */
  /* Attendance actions                                                     */
  /* ---------------------------------------------------------------------- */

  async function createAttendance(input: AttendanceInput): Promise<AttendanceRecord> {
    const created = await api.addAttendance(input);
    attendance.value = [created, ...attendance.value].sort((a, b) => (a.date < b.date ? 1 : -1));
    return created;
  }

  async function editAttendance(id: string, input: AttendanceInput): Promise<void> {
    await api.updateAttendance(id, input);
    await refreshAttendance();
  }

  async function removeAttendance(id: string): Promise<void> {
    await api.deleteAttendance(id);
    attendance.value = attendance.value.filter((r) => r.id !== id);
  }

  /* ---------------------------------------------------------------------- */
  /* Derived values                                                         */
  /* ---------------------------------------------------------------------- */

  /** Every record for one student, newest first. */
  function recordsForStudent(studentDocId: string): AttendanceRecord[] {
    return attendance.value.filter((r) => r.studentDocId === studentDocId);
  }

  /** Counts for today only - powers the dashboard. */
  const todaySummary = computed<AttendanceSummary>(() =>
    summarize(attendance.value.filter((r) => r.date === todayIso()))
  );

  /** Counts across every record ever saved. */
  const overallSummary = computed<AttendanceSummary>(() => summarize(attendance.value));

  const totalStudents = computed(() => students.value.length);

  const isLoading = computed(() => loadingStudents.value || loadingAttendance.value);

  return {
    // state
    students,
    attendance,
    loadingStudents,
    loadingAttendance,
    isLoading,
    loadError,
    // loaders
    refreshStudents,
    refreshAttendance,
    refreshAll,
    ensureLoaded,
    // students
    createStudent,
    editStudent,
    removeStudent,
    // attendance
    createAttendance,
    editAttendance,
    removeAttendance,
    // derived
    recordsForStudent,
    todaySummary,
    overallSummary,
    totalStudents,
  };
}
