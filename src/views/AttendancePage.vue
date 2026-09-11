<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>{{ isEditing ? 'Edit Attendance' : 'Attendance' }}</IonTitle>
        <IonButtons v-if="isEditing" slot="end">
          <IonButton @click="cancelEdit">Cancel</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">{{ isEditing ? 'Edit Attendance' : 'Record Attendance' }}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <ConnectionNotice @retry="load" />

      <template v-if="selectableStudents.length > 0">
        <SectionHeader title="Details" subtitle="Who and when" />

        <!--
          Students never get a picker. The record is written against the
          studentDocId on their own profile, and the Firestore rules check that
          server-side regardless of what the client sends.
        -->
        <AppCard v-if="isStudent" class="me ct-enter">
          <p class="me__label">Your Attendance</p>
          <p class="me__name">{{ profile?.fullName }}</p>
          <p class="me__id">{{ profile?.studentId }}</p>
        </AppCard>

        <IonList class="ct-field-list ct-enter">
          <IonItem v-if="isAdmin">
            <IonSelect
              v-model="form.studentDocId"
              label="Student"
              label-placement="stacked"
              placeholder="Choose a student"
              interface="action-sheet"
              :interface-options="{ header: 'Select Student' }"
              cancel-text="Cancel"
            >
              <IonSelectOption v-for="student in students" :key="student.id" :value="student.id">
                {{ student.studentName }} ({{ student.studentId }})
              </IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem lines="none">
            <IonLabel>Date</IonLabel>
            <IonDatetimeButton slot="end" datetime="attendance-date" />
          </IonItem>
        </IonList>

        <SectionHeader title="Status" />

        <IonSegment v-model="form.status" class="ct-segment ct-enter" :scrollable="false">
          <IonSegmentButton v-for="status in ATTENDANCE_STATUSES" :key="status" :value="status">
            <IonLabel>{{ status }}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <SectionHeader title="Remarks" subtitle="Optional" />

        <IonList class="ct-field-list ct-enter">
          <IonItem lines="none">
            <IonTextarea
              v-model="form.remarks"
              placeholder="e.g. On time"
              :auto-grow="true"
              :rows="2"
              :maxlength="200"
              enterkeyhint="done"
            />
          </IonItem>
        </IonList>

        <AppCard class="summary ct-enter">
          <div class="summary__row">
            <span class="summary__key">Student</span>
            <span class="summary__value">
              {{ selectedStudent?.studentName ?? 'Not selected' }}
            </span>
          </div>
          <div class="summary__row">
            <span class="summary__key">Date</span>
            <span class="summary__value">{{ formatLongDate(form.date) }}</span>
          </div>
          <div class="summary__row">
            <span class="summary__key">Status</span>
            <StatusBadge :status="form.status" />
          </div>
        </AppCard>

        <p v-if="formError" class="error" role="alert">
          <IonIcon :icon="alertCircleOutline" />
          {{ formError }}
        </p>

        <IonButton
          expand="block"
          class="ct-button-primary save"
          :disabled="saving"
          @click="save"
        >
          <IonIcon slot="start" :icon="saveOutline" />
          {{ saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Attendance' }}
        </IonButton>

        <IonButton
          v-if="isEditing"
          expand="block"
          class="ct-button-secondary cancel"
          @click="cancelEdit"
        >
          Cancel
        </IonButton>

        <div class="ct-safe-bottom" />
      </template>

      <EmptyState
        v-else-if="!loadingStudents && isAdmin"
        :icon="peopleOutline"
        title="No students yet"
        message="Add a student first, then you can start recording attendance."
      >
        <template #action>
          <IonButton expand="block" class="ct-button-primary" router-link="/tabs/students">
            <IonIcon slot="start" :icon="addOutline" />
            Add Student
          </IonButton>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!loadingStudents"
        :icon="personOutline"
        title="Account not linked"
        message="Your account is not linked to a student record yet. Please contact your administrator."
      />

      <SkeletonRows v-if="loadingStudents && students.length === 0" :count="3" />
    </IonContent>

    <!--
      The date picker lives outside IonContent and outside every v-if on purpose.
      Ionic moves a modal's DOM node when it presents, so if the modal sat inside a
      conditional block, Vue would later try to patch around a node that had been
      relocated and the whole page would fail to render.
    -->
    <IonModal :keep-contents-mounted="true">
      <IonDatetime
        id="attendance-date"
        v-model="pickerDate"
        presentation="date"
        :prefer-wheel="false"
        :show-default-buttons="true"
        done-text="Done"
        cancel-text="Cancel"
      />
    </IonModal>
  </IonPage>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline,
  alertCircleOutline,
  peopleOutline,
  personOutline,
  saveOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import ConnectionNotice from '@/components/ConnectionNotice.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import SkeletonRows from '@/components/SkeletonRows.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useAuth } from '@/composables/useAuth';
import { useClassData } from '@/composables/useClassData';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/types';
import { formatLongDate, todayIso } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const { isAdmin, isStudent, profile, linkedStudentDocId } = useAuth();
const { showToast, showError, messageOf } = useFeedback();
const {
  students,
  attendance,
  loadingStudents,
  refreshAll,
  ensureLoaded,
  createAttendance,
  editAttendance,
} = useClassData();

const saving = ref(false);
const formError = ref('');
/** Set when the Records tab sends us here with `?edit=<recordId>`. */
const editingId = ref<string | null>(null);

const form = reactive({
  studentDocId: '',
  date: todayIso(),
  status: 'Present' as AttendanceStatus,
  remarks: '',
});

/** IonDatetime returns a full ISO string; keep only the calendar part. */
const pickerDate = ref<string>(todayIso());
watch(pickerDate, (value) => {
  if (typeof value === 'string' && value.length >= 10) form.date = value.slice(0, 10);
});

const isEditing = computed(() => editingId.value !== null);

const selectedStudent = computed(
  () => students.value.find((s) => s.id === form.studentDocId) ?? null
);

/**
 * What the form can act on. An admin sees the whole class; a student sees only
 * their own linked record, which is also what the empty state keys off.
 */
const selectableStudents = computed(() =>
  isAdmin.value
    ? students.value
    : students.value.filter((s) => s.id === linkedStudentDocId.value)
);

function resetForm(): void {
  editingId.value = null;
  // A student can only ever act for themselves, so the field is pre-bound.
  form.studentDocId = isStudent.value ? (linkedStudentDocId.value ?? '') : '';
  form.date = todayIso();
  pickerDate.value = todayIso();
  form.status = 'Present';
  form.remarks = '';
  formError.value = '';
}

/** Reads `?edit=` / `?student=` and fills the form accordingly. */
function applyQuery(): void {
  const editId = typeof route.query.edit === 'string' ? route.query.edit : null;
  const preselect = typeof route.query.student === 'string' ? route.query.student : null;

  if (editId) {
    const record = attendance.value.find((r) => r.id === editId);
    if (record && isStudent.value && record.studentDocId !== linkedStudentDocId.value) {
      // Not this student's record - fall back to a blank form rather than load it.
      resetForm();
      return;
    }
    if (record) {
      editingId.value = record.id;
      form.studentDocId = record.studentDocId;
      form.date = record.date;
      pickerDate.value = record.date;
      form.status = record.status;
      form.remarks = record.remarks;
      formError.value = '';
      return;
    }
    // The record was deleted elsewhere - fall back to a blank form.
    resetForm();
    return;
  }

  resetForm();
  // Only an admin may target another student via the query string.
  if (preselect && isAdmin.value) form.studentDocId = preselect;
}

/** Loads students and records, then fills the form from the query string. */
async function load(): Promise<void> {
  if (!isFirebaseConfigured) {
    applyQuery();
    return;
  }
  try {
    await ensureLoaded();
    // Records may have changed on another tab; make sure the edit target exists.
    if (typeof route.query.edit === 'string') await refreshAll();
  } catch (error) {
    await showError(error, 'Could not load the attendance form.');
  } finally {
    applyQuery();
  }
}

onIonViewWillEnter(load);

// Re-apply whenever the query string changes while the page stays mounted.
watch(() => route.fullPath, applyQuery);

function cancelEdit(): void {
  resetForm();
  router.replace('/tabs/records');
}

/** Checks the required fields before writing to Firestore. */
function validate(): boolean {
  if (!form.studentDocId) {
    formError.value = 'Please choose a student.';
    return false;
  }
  if (!form.date) {
    formError.value = 'Please choose a date.';
    return false;
  }
  if (!form.status) {
    formError.value = 'Please choose an attendance status.';
    return false;
  }
  formError.value = '';
  return true;
}

async function save(): Promise<void> {
  if (saving.value || !validate()) return;

  const student = selectedStudent.value;
  if (!student) {
    formError.value = isStudent.value
      ? 'Your account is not linked to a student record. Please contact your administrator.'
      : 'That student no longer exists. Please choose another one.';
    return;
  }

  // Last line of defence in the UI; the Firestore rules enforce the same thing.
  if (isStudent.value && student.id !== linkedStudentDocId.value) {
    formError.value = 'You can only record your own attendance.';
    return;
  }

  saving.value = true;
  const payload = {
    studentDocId: student.id,
    studentId: student.studentId,
    studentName: student.studentName,
    date: form.date,
    status: form.status,
    remarks: form.remarks.trim(),
  };

  try {
    if (editingId.value) {
      await editAttendance(editingId.value, payload);
      resetForm();
      await showToast('Attendance updated successfully.');
      router.replace('/tabs/records');
    } else {
      await createAttendance(payload);
      const savedName = student.studentName;
      resetForm();
      await showToast(`Attendance recorded successfully for ${savedName}.`);
    }
  } catch (error) {
    formError.value = messageOf(error, 'Could not save the attendance record.');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.me {
  margin-bottom: 14px;
}

.me__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.me__name {
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--ct-text);
}

.me__id {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--ct-text-2);
  font-variant-numeric: tabular-nums;
}

.summary {
  margin-top: 20px;
  padding: 4px 16px;
}

.summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  font-size: 14px;
}

.summary__row + .summary__row {
  border-top: 1px solid var(--ct-border-soft);
}

.summary__key {
  color: var(--ct-text-2);
}

.summary__value {
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ct-text);
  text-align: right;
}

.error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 13px;
  font-weight: 550;
  color: var(--ct-absent);
}

.error ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.save {
  margin-top: 20px;
}

.cancel {
  margin-top: 10px;
}

ion-datetime {
  --background: var(--ct-bg-2);
  margin: 0 auto;
}
</style>
