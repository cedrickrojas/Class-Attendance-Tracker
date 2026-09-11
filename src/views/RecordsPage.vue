<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Records</IonTitle>
        <IonButtons slot="end">
          <IonButton router-link="/tabs/attendance" aria-label="Record attendance">
            <IonIcon slot="icon-only" :icon="addOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Attendance Records</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent />
      </IonRefresher>

      <ConnectionNotice @retry="load" />

      <SearchBar v-model="searchTerm" placeholder="Search name or student ID..." class="search-row" />

      <IonSegment v-model="statusFilter" class="ct-segment" :scrollable="false">
        <IonSegmentButton value="All"><IonLabel>All</IonLabel></IonSegmentButton>
        <IonSegmentButton v-for="status in ATTENDANCE_STATUSES" :key="status" :value="status">
          <IonLabel>{{ status }}</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      <div class="filters">
        <button type="button" class="chip" @click="isDateOpen = true">
          <IonIcon :icon="calendarOutline" />
          {{ dateFilter ? formatShortDate(dateFilter) : 'All dates' }}
        </button>
        <button
          v-if="dateFilter"
          type="button"
          class="chip chip--ghost"
          @click="dateFilter = ''"
        >
          <IonIcon :icon="closeCircleOutline" />
          Clear
        </button>
        <button v-else type="button" class="chip chip--ghost" @click="dateFilter = todayIso()">
          Today
        </button>
      </div>

      <p v-if="attendance.length > 0" class="summary-line">
        {{ filteredRecords.length }} record{{ filteredRecords.length === 1 ? '' : 's' }}
        <template v-if="filteredRecords.length > 0">
          &middot; {{ filteredSummary.rate }}% attendance rate
        </template>
      </p>

      <SkeletonRows v-if="loadingAttendance && attendance.length === 0" :count="4" />

      <template v-else-if="groupedRecords.length > 0">
        <section v-for="group in groupedRecords" :key="group.date" class="group ct-enter">
          <h2 class="group__date">{{ formatLongDate(group.date) }}</h2>
          <AppCard flush>
            <AttendanceCard
              v-for="record in group.records"
              :key="record.id"
              :record="record"
              :can-manage="isAdmin"
              @edit="editRecord(record)"
              @delete="confirmDelete(record)"
            />
          </AppCard>
        </section>
      </template>

      <EmptyState
        v-else-if="attendance.length === 0 && !loadingAttendance"
        :icon="documentTextOutline"
        title="No attendance recorded"
        message="Record today's attendance to see your class overview."
      >
        <template #action>
          <IonButton expand="block" class="ct-button-primary" router-link="/tabs/attendance">
            <IonIcon slot="start" :icon="addOutline" />
            Record Attendance
          </IonButton>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!loadingAttendance"
        :icon="filterOutline"
        title="No matching records"
        message="Try a different status, date or search term."
      >
        <template #action>
          <IonButton expand="block" class="ct-button-secondary" @click="clearFilters">
            Clear Filters
          </IonButton>
        </template>
      </EmptyState>

      <div class="ct-safe-bottom" />
    </IonContent>

    <!--
      Kept outside IonContent and outside every v-if: Ionic relocates a modal's DOM
      node when it presents, and patching conditional siblings around a moved node
      breaks Vue's renderer.
    -->
    <IonModal :is-open="isDateOpen" class="date-modal" @didDismiss="isDateOpen = false">
      <IonDatetime
        presentation="date"
        :value="dateFilter || todayIso()"
        :show-default-buttons="true"
        done-text="Apply"
        cancel-text="Cancel"
        @ionChange="onPickDate"
      />
    </IonModal>
  </IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline,
  calendarOutline,
  closeCircleOutline,
  documentTextOutline,
  filterOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import AttendanceCard from '@/components/AttendanceCard.vue';
import ConnectionNotice from '@/components/ConnectionNotice.vue';
import SearchBar from '@/components/SearchBar.vue';
import SkeletonRows from '@/components/SkeletonRows.vue';
import EmptyState from '@/components/EmptyState.vue';
import { summarize, useClassData } from '@/composables/useClassData';
import { useAuth } from '@/composables/useAuth';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';
import { ATTENDANCE_STATUSES, type AttendanceRecord, type AttendanceStatus } from '@/types';
import { formatLongDate, formatShortDate, todayIso } from '@/utils/date';

const router = useRouter();
const { isAdmin, isStudent, linkedStudentDocId } = useAuth();
const { showToast, showError, confirm } = useFeedback();
const { attendance, loadingAttendance, refreshAll, removeAttendance } = useClassData();

const searchTerm = ref('');
const statusFilter = ref<'All' | AttendanceStatus>('All');
/** Empty string means "all dates". */
const dateFilter = ref('');
const isDateOpen = ref(false);

/** Applies the search box plus the status and date filters. */
const filteredRecords = computed<AttendanceRecord[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();

  return attendance.value.filter((record) => {
    // A student's records list is their own history only.
    if (isStudent.value && record.studentDocId !== linkedStudentDocId.value) return false;
    if (statusFilter.value !== 'All' && record.status !== statusFilter.value) return false;
    if (dateFilter.value && record.date !== dateFilter.value) return false;
    if (term) {
      const haystack = `${record.studentName} ${record.studentId}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

const filteredSummary = computed(() => summarize(filteredRecords.value));

/** Groups the visible records under their date heading, newest date first. */
const groupedRecords = computed(() => {
  const groups = new Map<string, AttendanceRecord[]>();
  for (const record of filteredRecords.value) {
    const bucket = groups.get(record.date);
    if (bucket) bucket.push(record);
    else groups.set(record.date, [record]);
  }
  return Array.from(groups, ([date, records]) => ({ date, records })).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
});

async function load(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await refreshAll();
  } catch (error) {
    await showError(error, 'Could not load attendance records.');
  }
}

onIonViewWillEnter(load);

async function handleRefresh(event: CustomEvent): Promise<void> {
  await load();
  (event.target as HTMLIonRefresherElement).complete();
}

function onPickDate(event: CustomEvent): void {
  const value = (event.detail as { value?: string | string[] }).value;
  if (typeof value === 'string' && value.length >= 10) dateFilter.value = value.slice(0, 10);
  isDateOpen.value = false;
}

function clearFilters(): void {
  searchTerm.value = '';
  statusFilter.value = 'All';
  dateFilter.value = '';
}

/** Opens the Attendance tab in edit mode for this record. */
function editRecord(record: AttendanceRecord): void {
  if (!isAdmin.value) return;
  router.push({ path: '/tabs/attendance', query: { edit: record.id } });
}

async function confirmDelete(record: AttendanceRecord): Promise<void> {
  if (!isAdmin.value) return;
  const ok = await confirm({
    header: 'Delete Attendance?',
    message: 'Are you sure you want to delete this attendance record?',
    confirmText: 'Delete',
    destructive: true,
  });
  if (!ok) return;

  try {
    await removeAttendance(record.id);
    await showToast('Attendance deleted successfully.');
  } catch (error) {
    await showError(error, 'Could not delete the attendance record.');
  }
}
</script>

<style scoped>
.search-row {
  margin-bottom: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-height: 36px;
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-chip);
  background: var(--ct-card);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--ct-text);
  cursor: pointer;
}

.chip ion-icon {
  font-size: 15px;
  color: var(--ct-text-2);
}

.chip--ghost {
  background: transparent;
  color: var(--ct-accent);
}

.chip--ghost ion-icon {
  color: var(--ct-accent);
}

.summary-line {
  margin: 14px 2px 0;
  font-size: 12px;
  color: var(--ct-text-3);
}

.group {
  margin-top: 18px;
}

.group__date {
  margin: 0 2px 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.date-modal {
  --height: auto;
  --width: 94%;
  --border-radius: var(--ct-r-lg);
  --box-shadow: var(--ct-shadow-lift);
  align-items: center;
  justify-content: center;
}

.date-modal ion-datetime {
  --background: var(--ct-bg-2);
}
</style>
