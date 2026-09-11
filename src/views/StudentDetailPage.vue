<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton default-href="/tabs/students" text="Students" />
        </IonButtons>
        <IonTitle>Student</IonTitle>
        <IonButtons slot="end">
          <IonButton :disabled="!student" aria-label="Student actions" @click="openActions">
            <IonIcon slot="icon-only" :icon="ellipsisHorizontalCircleOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <template v-if="student">
        <AppCard class="profile ct-enter">
          <div class="profile__head">
            <div class="profile__avatar">{{ initials }}</div>
            <div class="profile__id">
              <h1 class="profile__name">{{ student.studentName }}</h1>
              <p class="profile__meta">
                <span class="profile__code">{{ student.studentId }}</span>
                <span class="profile__dot">&middot;</span>
                <span>{{ student.courseSection }}</span>
              </p>
            </div>
          </div>

          <div class="profile__rate">
            <div>
              <p class="profile__label">Attendance Rate</p>
              <p class="profile__figure">{{ summary.rate }}<span class="profile__unit">%</span></p>
            </div>
            <p class="profile__count">
              {{ summary.present }} / {{ summary.total }}
              <span>present</span>
            </p>
          </div>

          <div
            class="ct-meter"
            role="img"
            :aria-label="`Attendance rate ${summary.rate} percent`"
          >
            <div
              class="ct-meter__fill"
              :class="meterClass"
              :style="{ width: summary.rate + '%' }"
            />
          </div>
        </AppCard>

        <SectionHeader title="Breakdown" />

        <div class="grid ct-enter">
          <StatCard
            label="Present"
            tone="present"
            :icon="checkmarkCircleOutline"
            :value="summary.present"
          />
          <StatCard
            label="Absent"
            tone="absent"
            :icon="closeCircleOutline"
            :value="summary.absent"
          />
          <StatCard label="Late" tone="late" :icon="timeOutline" :value="summary.late" />
          <StatCard
            label="Excused"
            tone="excused"
            :icon="documentTextOutline"
            :value="summary.excused"
          />
        </div>

        <SectionHeader title="Attendance History" :subtitle="`${history.length} records`" />

        <AppCard v-if="history.length > 0" flush class="ct-enter">
          <IonList lines="none" class="history">
            <template v-for="(record, index) in history" :key="record.id">
              <div v-if="index > 0" class="divider" />
              <IonItem>
                <IonLabel>
                  <h3 class="history__date">{{ formatShortDate(record.date) }}</h3>
                  <p class="history__note">
                    {{ record.remarks || formatWeekday(record.date) }}
                  </p>
                </IonLabel>
                <StatusBadge slot="end" :status="record.status" />
              </IonItem>
            </template>
          </IonList>
        </AppCard>

        <EmptyState
          v-else
          :icon="calendarOutline"
          title="No attendance recorded"
          :message="`Start recording attendance for ${student.studentName}.`"
        />

        <IonButton expand="block" class="ct-button-primary action" @click="recordAttendance">
          <IonIcon slot="start" :icon="addOutline" />
          Record Attendance
        </IonButton>

        <div class="ct-safe-bottom" />
      </template>

      <EmptyState
        v-else-if="!isLoading"
        :icon="personOutline"
        title="Student not found"
        message="This student may have been deleted."
      />

      <SkeletonRows v-if="isLoading && !student" :count="3" />
    </IonContent>

    <StudentFormModal
      :is-open="isFormOpen"
      :student="student"
      @close="isFormOpen = false"
    />
  </IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  actionSheetController,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline,
  calendarOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  closeCircle,
  closeCircleOutline,
  createOutline,
  documentTextOutline,
  ellipsisHorizontalCircleOutline,
  personOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import SkeletonRows from '@/components/SkeletonRows.vue';
import StatCard from '@/components/StatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import StudentFormModal from '@/components/StudentFormModal.vue';
import { summarize, useClassData } from '@/composables/useClassData';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';
import { formatShortDate, formatWeekday } from '@/utils/date';
import type { AttendanceStatus, Student } from '@/types';

const route = useRoute();
const router = useRouter();
const { showToast, showError, confirm } = useFeedback();
const { students, isLoading, ensureLoaded, refreshAll, recordsForStudent, removeStudent } =
  useClassData();

const isFormOpen = ref(false);

const studentId = computed(() => String(route.params.id ?? ''));

/** The student is read straight from the shared store, so edits show instantly. */
const student = computed<Student | null>(
  () => students.value.find((s) => s.id === studentId.value) ?? null
);

const history = computed(() => recordsForStudent(studentId.value));

/** Present / Total x 100, calculated from the records in Firestore. */
const summary = computed(() => summarize(history.value));

/** Severity band for the meter - paired with the numeric label beside it. */
const meterClass = computed(() => {
  if (summary.value.total === 0) return '';
  const rate = summary.value.rate;
  if (rate >= 90) return 'ct-meter__fill--good';
  if (rate >= 75) return '';
  if (rate >= 50) return 'ct-meter__fill--warning';
  return 'ct-meter__fill--critical';
});

/** Status colours never travel alone - each chip carries this icon plus its label. */
function statusIcon(status: AttendanceStatus): string {
  if (status === 'Present') return checkmarkCircle;
  if (status === 'Absent') return closeCircle;
  if (status === 'Late') return timeOutline;
  return documentTextOutline;
}

const initials = computed(() => {
  const parts = student.value?.studentName.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});

onIonViewWillEnter(async () => {
  if (!isFirebaseConfigured) return;
  try {
    await ensureLoaded();
  } catch (error) {
    await showError(error, 'Could not load this student.');
  }
});

/** Jumps to the Attendance tab with this student pre-selected. */
function recordAttendance(): void {
  router.push({ path: '/tabs/attendance', query: { student: studentId.value } });
}

async function openActions(): Promise<void> {
  const sheet = await actionSheetController.create({
    header: student.value?.studentName,
    buttons: [
      {
        text: 'Edit Student',
        icon: createOutline,
        handler: () => {
          isFormOpen.value = true;
        },
      },
      {
        text: 'Delete Student',
        role: 'destructive',
        icon: trashOutline,
        handler: () => {
          // Run after the sheet finishes closing so the alert is not blocked.
          setTimeout(confirmDelete, 250);
        },
      },
      { text: 'Cancel', role: 'cancel' },
    ],
  });
  await sheet.present();
}

async function confirmDelete(): Promise<void> {
  if (!student.value) return;

  const ok = await confirm({
    header: 'Delete Student?',
    message: `This will also delete every attendance record for ${student.value.studentName}.`,
    confirmText: 'Delete',
    destructive: true,
  });
  if (!ok) return;

  try {
    await removeStudent(student.value.id);
    await showToast('Student deleted successfully.');
    router.replace('/tabs/students');
  } catch (error) {
    await showError(error, 'Could not delete the student.');
    await refreshAll();
  }
}
</script>

<style scoped>
.profile__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: var(--ct-r-md);
  font-size: 15px;
  font-weight: 700;
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.profile__id {
  min-width: 0;
}

.profile__name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--ct-text);
}

.profile__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.profile__code {
  font-variant-numeric: tabular-nums;
}

.profile__dot {
  color: var(--ct-text-3);
}

.profile__rate {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 0 12px;
  padding-top: 16px;
  border-top: 1px solid var(--ct-border-soft);
}

.profile__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.profile__figure {
  margin: 6px 0 0;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.profile__unit {
  font-size: 18px;
  font-weight: 650;
  color: var(--ct-text-2);
}

.profile__count {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  color: var(--ct-text-2);
  font-variant-numeric: tabular-nums;
}

.profile__count span {
  font-weight: 400;
  color: var(--ct-text-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.history ion-item {
  --background: var(--ct-card);
  --min-height: 56px;
  --padding-start: 14px;
  --inner-padding-end: 12px;
}

.history__date {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ct-text);
}

.history__note {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.divider {
  height: 1px;
  margin-left: 14px;
  background: var(--ct-border-soft);
}

.action {
  margin-top: 20px;
}
</style>
