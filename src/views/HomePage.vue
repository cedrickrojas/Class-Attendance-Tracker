<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Class Trackerbonia</IonTitle>
        <IonButtons slot="end">
          <IonButton router-link="/tabs/settings" aria-label="Settings">
            <IonIcon slot="icon-only" :icon="settingsOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Class Trackerbonia</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent />
      </IonRefresher>

      <p class="subtitle">Smart Class Attendance Tracker</p>

      <ConnectionNotice @retry="load" />

      <!-- Overview -------------------------------------------------- -->
      <div class="overview ct-enter">
        <h2 class="overview__title">
          {{ isStudent ? `Welcome back, ${firstName}` : 'Today\u2019s Overview' }}
        </h2>
        <p class="overview__date">
          <template v-if="isStudent">Student ID: {{ profile?.studentId }}</template>
          <template v-else>{{ todayLabel }}</template>
        </p>
      </div>

      <AppCard class="roster ct-enter">
        <div class="roster__main">
          <div>
            <p class="roster__figure">{{ isStudent ? myTotal : totalStudents }}</p>
            <p class="roster__label">
              {{ isStudent ? 'Records Logged' : 'Total Students' }}
            </p>
          </div>
          <span v-if="isStudent" class="roster__badge" :class="todayBadgeClass">
            <IonIcon :icon="todayStatusIcon" />
            {{ todayStatusLabel }}
          </span>
          <span v-else class="roster__badge" :class="`roster__badge--${severity}`">
            <IonIcon :icon="severityIcon" />
            {{ severityLabel }}
          </span>
        </div>
        <p class="roster__support">
          <template v-if="isStudent">
            Today&rsquo;s status: {{ todayStatusLabel }}
          </template>
          <template v-else-if="totalStudents === 0">Add students to start tracking</template>
          <template v-else-if="pendingCount > 0">
            {{ pendingCount }} record{{ pendingCount === 1 ? '' : 's' }} pending
          </template>
          <template v-else>All students recorded today</template>
        </p>
      </AppCard>

      <!-- Breakdown ------------------------------------------------- -->
      <SectionHeader
        :title="isStudent ? 'Your Attendance' : 'Attendance Summary'"
        :subtitle="isStudent ? 'All time' : 'Recorded today'"
      />

      <div class="grid ct-enter">
        <StatCard
          label="Present"
          tone="present"
          :icon="checkmarkCircleOutline"
          :value="shownSummary.present"
        />
        <StatCard
          label="Absent"
          tone="absent"
          :icon="closeCircleOutline"
          :value="shownSummary.absent"
        />
        <StatCard label="Late" tone="late" :icon="timeOutline" :value="shownSummary.late" />
        <StatCard
          label="Excused"
          tone="excused"
          :icon="documentTextOutline"
          :value="shownSummary.excused"
        />
      </div>

      <!-- Rate ------------------------------------------------------- -->
      <SectionHeader title="Attendance Rate" />

      <AppCard class="rate ct-enter">
        <div class="rate__head">
          <p class="rate__figure">{{ shownSummary.rate }}<span class="rate__unit">%</span></p>
          <p v-if="!isStudent" class="rate__overall">
            Overall <strong>{{ overallSummary.rate }}%</strong>
          </p>
        </div>

        <div
          class="ct-meter rate__meter"
          role="img"
          :aria-label="`Attendance rate ${shownSummary.rate} percent`"
        >
          <div
            class="ct-meter__fill"
            :class="meterClass"
            :style="{ width: shownSummary.rate + '%' }"
          />
        </div>

        <p class="rate__caption">
          <template v-if="shownSummary.total > 0">
            {{ shownSummary.present }} of {{ shownSummary.total }}
            {{ isStudent ? 'records marked present' : 'students recorded present' }}
          </template>
          <template v-else>No attendance recorded yet</template>
        </p>
      </AppCard>

      <!-- Primary action -------------------------------------------- -->
      <IonButton expand="block" class="ct-button-primary cta" router-link="/tabs/attendance">
        <IonIcon slot="start" :icon="addOutline" />
        Record Attendance
      </IonButton>

      <!-- Quick actions --------------------------------------------- -->
      <SectionHeader title="Quick Actions" />

      <AppCard flush class="ct-enter">
        <QuickAction
          :icon="peopleOutline"
          :title="isAdmin ? 'Manage Students' : 'View Students'"
          :description="isAdmin ? 'Add or manage your class list' : 'Browse your class list'"
          @select="router.push('/tabs/students')"
        />
        <div class="divider" />
        <QuickAction
          :icon="barChartOutline"
          title="View Records"
          :description="isAdmin ? 'Review attendance history' : 'Review your attendance history'"
          @select="router.push('/tabs/records')"
        />
      </AppCard>

      <div class="ct-safe-bottom" />
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline,
  alertCircleOutline,
  barChartOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  documentTextOutline,
  peopleOutline,
  removeCircleOutline,
  settingsOutline,
  timeOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import ConnectionNotice from '@/components/ConnectionNotice.vue';
import QuickAction from '@/components/QuickAction.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import StatCard from '@/components/StatCard.vue';
import { useAuth } from '@/composables/useAuth';
import { summarize, useClassData } from '@/composables/useClassData';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';
import { formatLongDate, formatWeekday, todayIso } from '@/utils/date';

const router = useRouter();
const { isAdmin, isStudent, profile, linkedStudentDocId } = useAuth();
const {
  students,
  attendance,
  totalStudents,
  todaySummary,
  overallSummary,
  refreshAll,
  recordsForStudent,
} = useClassData();

/** First name only - the greeting reads better than the full legal name. */
const firstName = computed(() => (profile.value?.fullName ?? '').trim().split(/\s+/)[0] ?? '');

/** Every record belonging to the signed-in student. */
const myRecords = computed(() =>
  linkedStudentDocId.value ? recordsForStudent(linkedStudentDocId.value) : []
);

/** A student's own totals; an admin keeps the class view for today. */
const mySummary = computed(() => summarize(myRecords.value));
const myTotal = computed(() => mySummary.value.total);

const shownSummary = computed(() => (isStudent.value ? mySummary.value : todaySummary.value));

/** The student's own status for today, if it has been recorded. */
const todayRecord = computed(
  () => myRecords.value.find((r) => r.date === todayIso()) ?? null
);

const todayStatusLabel = computed(() => todayRecord.value?.status ?? 'Not Recorded');

const todayStatusIcon = computed(() => {
  const status = todayRecord.value?.status;
  if (!status) return removeCircleOutline;
  if (status === 'Present') return checkmarkCircleOutline;
  if (status === 'Late') return timeOutline;
  if (status === 'Excused') return documentTextOutline;
  return closeCircleOutline;
});

const todayBadgeClass = computed(() => {
  const status = todayRecord.value?.status;
  if (!status) return 'roster__badge--idle';
  if (status === 'Present') return 'roster__badge--good';
  if (status === 'Late') return 'roster__badge--warning';
  if (status === 'Excused') return 'roster__badge--steady';
  return 'roster__badge--critical';
});
const { showError } = useFeedback();

/** e.g. "Friday, September 11". */
const todayLabel = computed(() => {
  const iso = todayIso();
  return `${formatWeekday(iso)}, ${formatLongDate(iso).replace(/, \d{4}$/, '')}`;
});

/** Students with no record for today. */
const pendingCount = computed(() => {
  if (totalStudents.value === 0) return 0;
  const recorded = new Set(
    attendance.value.filter((r) => r.date === todayIso()).map((r) => r.studentDocId)
  );
  return students.value.filter((s) => !recorded.has(s.id)).length;
});

/** Severity band for the meter and badge - never colour alone, always with a label. */
const severity = computed(() => {
  if (todaySummary.value.total === 0) return 'idle';
  const rate = todaySummary.value.rate;
  if (rate >= 90) return 'good';
  if (rate >= 75) return 'steady';
  if (rate >= 50) return 'warning';
  return 'critical';
});

const severityLabel = computed(
  () =>
    ({
      idle: 'No data',
      good: 'Strong',
      steady: 'On track',
      warning: 'Attention',
      critical: 'Critical',
    })[severity.value]
);

const severityIcon = computed(() =>
  severity.value === 'good' || severity.value === 'steady'
    ? checkmarkCircleOutline
    : severity.value === 'idle'
      ? removeCircleOutline
      : alertCircleOutline
);

const meterClass = computed(
  () =>
    ({
      idle: '',
      good: 'ct-meter__fill--good',
      steady: '',
      warning: 'ct-meter__fill--warning',
      critical: 'ct-meter__fill--critical',
    })[severity.value]
);

async function load(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await refreshAll();
  } catch (error) {
    await showError(error, 'Could not load the dashboard.');
  }
}

onIonViewWillEnter(load);

async function handleRefresh(event: CustomEvent): Promise<void> {
  await load();
  (event.target as HTMLIonRefresherElement).complete();
}
</script>

<style scoped>
.subtitle {
  margin: 0 2px 18px;
  font-size: 13px;
  color: var(--ct-text-2);
}

/* Overview ------------------------------------------------------------- */
.overview {
  margin: 0 2px 12px;
}

.overview__title {
  margin: 0;
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ct-text);
}

.overview__date {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--ct-text-2);
}

/* Roster --------------------------------------------------------------- */
.roster__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.roster__figure {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.roster__label {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 550;
  color: var(--ct-text-2);
}

.roster__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--ct-r-chip);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ct-text-2);
  background: var(--ct-elevated);
  border: 1px solid var(--ct-border);
}

.roster__badge ion-icon {
  font-size: 12px;
}

.roster__badge--good,
.roster__badge--steady {
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border-color: var(--ct-accent-line);
}

.roster__badge--warning {
  color: var(--ct-late);
  background: var(--ct-late-soft);
  border-color: var(--ct-late-soft);
}

.roster__badge--critical {
  color: var(--ct-absent);
  background: var(--ct-absent-soft);
  border-color: var(--ct-absent-soft);
}

.roster__support {
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--ct-border-soft);
  font-size: 12.5px;
  color: var(--ct-text-3);
}

/* Grid ----------------------------------------------------------------- */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

/* Rate ----------------------------------------------------------------- */
.rate__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.rate__figure {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.rate__unit {
  font-size: 18px;
  font-weight: 650;
  margin-left: 2px;
  color: var(--ct-text-2);
}

.rate__overall {
  margin: 0;
  font-size: 12.5px;
  color: var(--ct-text-3);
}

.rate__overall strong {
  color: var(--ct-text-2);
  font-weight: 650;
}

.rate__meter {
  margin: 14px 0 10px;
}

.rate__caption {
  margin: 0;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

/* Actions -------------------------------------------------------------- */
.cta {
  margin-top: 20px;
}

.divider {
  height: 1px;
  background: var(--ct-border-soft);
}
</style>
