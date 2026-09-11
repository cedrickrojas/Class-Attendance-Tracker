<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Students</IonTitle>
        <IonButtons v-if="isAdmin" slot="end">
          <IonButton aria-label="Add student" @click="openAdd">
            <IonIcon slot="icon-only" :icon="addOutline" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Students</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonRefresher slot="fixed" @ionRefresh="handleRefresh">
        <IonRefresherContent />
      </IonRefresher>

      <ConnectionNotice @retry="load" />

      <AppCard class="total ct-enter">
        <div>
          <p class="total__figure">{{ students.length }}</p>
          <p class="total__label">Total Students</p>
        </div>
        <span class="total__icon"><IonIcon :icon="peopleOutline" /></span>
      </AppCard>

      <SearchBar v-model="searchTerm" placeholder="Search students..." class="search-row" />

      <div class="toolbar">
        <span class="toolbar__count">
          {{ filteredStudents.length }} of {{ students.length }} shown
        </span>
        <button type="button" class="toolbar__sort" @click="toggleSort">
          <IonIcon :icon="swapVerticalOutline" />
          {{ sortLabel }}
        </button>
      </div>

      <SkeletonRows v-if="loadingStudents && students.length === 0" :count="4" />

      <AppCard v-else-if="filteredStudents.length > 0" flush class="ct-enter">
        <IonList lines="none" class="list">
          <template v-for="(student, index) in filteredStudents" :key="student.id">
            <div v-if="index > 0" class="divider" />
            <StudentCard
              :student="student"
              :rate="rateFor(student.id)"
              :record-count="recordsForStudent(student.id).length"
              :can-manage="isAdmin"
              @view="openDetail(student)"
              @edit="openEdit(student)"
              @delete="confirmDelete(student)"
            />
          </template>
        </IonList>
      </AppCard>

      <EmptyState
        v-else-if="students.length === 0 && !loadingStudents"
        :icon="peopleOutline"
        title="No students yet"
        :message="
          isAdmin
            ? 'Add your first student to start tracking attendance.'
            : 'Your administrator has not added any students yet.'
        "
      >
        <template v-if="isAdmin" #action>
          <IonButton expand="block" class="ct-button-primary" @click="openAdd">
            <IonIcon slot="start" :icon="addOutline" />
            Add Student
          </IonButton>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!loadingStudents"
        :icon="searchOutline"
        title="No matches"
        :message="'No student matches “' + searchTerm + '”.'"
      />

      <div class="ct-safe-bottom" />
    </IonContent>

    <StudentFormModal
      v-if="isAdmin"
      :is-open="isFormOpen"
      :student="editingStudent"
      @close="closeForm"
    />
  </IonPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonList,
  IonPage,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  addOutline,
  peopleOutline,
  searchOutline,
  swapVerticalOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import ConnectionNotice from '@/components/ConnectionNotice.vue';
import SearchBar from '@/components/SearchBar.vue';
import SkeletonRows from '@/components/SkeletonRows.vue';
import StudentCard from '@/components/StudentCard.vue';
import StudentFormModal from '@/components/StudentFormModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { summarize, useClassData } from '@/composables/useClassData';
import { useAuth } from '@/composables/useAuth';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';
import type { Student } from '@/types';

const router = useRouter();
const { isAdmin } = useAuth();
const { showToast, showError, confirm } = useFeedback();
const { students, loadingStudents, refreshAll, removeStudent, recordsForStudent } = useClassData();

const searchTerm = ref('');
/** Display order only. The stored data is untouched. */
const sortBy = ref<'name' | 'rate'>('name');
const sortLabel = computed(() => (sortBy.value === 'name' ? 'Name' : 'Rate'));

function toggleSort(): void {
  sortBy.value = sortBy.value === 'name' ? 'rate' : 'name';
}
const isFormOpen = ref(false);
const editingStudent = ref<Student | null>(null);

/** Live search by student name, student ID or section. */
const filteredStudents = computed<Student[]>(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const matched = !term
    ? [...students.value]
    : students.value.filter(
        (s) =>
          s.studentName.toLowerCase().includes(term) ||
          s.studentId.toLowerCase().includes(term) ||
          s.courseSection.toLowerCase().includes(term)
      );

  if (sortBy.value === 'rate') {
    return matched.sort((a, b) => rateFor(b.id) - rateFor(a.id));
  }
  return matched;
});

/** Attendance rate for one student, calculated from the loaded records. */
function rateFor(studentDocId: string): number {
  return summarize(recordsForStudent(studentDocId)).rate;
}

async function load(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await refreshAll();
  } catch (error) {
    await showError(error, 'Could not load students.');
  }
}

onIonViewWillEnter(load);

async function handleRefresh(event: CustomEvent): Promise<void> {
  await load();
  (event.target as HTMLIonRefresherElement).complete();
}

function openDetail(student: Student): void {
  router.push(`/tabs/students/${student.id}`);
}

function openAdd(): void {
  if (!isAdmin.value) return;
  editingStudent.value = null;
  isFormOpen.value = true;
}

function openEdit(student: Student): void {
  if (!isAdmin.value) return;
  editingStudent.value = student;
  isFormOpen.value = true;
}

function closeForm(): void {
  isFormOpen.value = false;
  editingStudent.value = null;
}

async function confirmDelete(student: Student): Promise<void> {
  if (!isAdmin.value) return;
  const ok = await confirm({
    header: 'Delete Student?',
    message: `This will also delete every attendance record for ${student.studentName}.`,
    confirmText: 'Delete',
    destructive: true,
  });
  if (!ok) return;

  try {
    await removeStudent(student.id);
    await showToast('Student deleted successfully.');
  } catch (error) {
    await showError(error, 'Could not delete the student.');
  }
}
</script>

<style scoped>
.total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.total__figure {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.total__label {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 550;
  color: var(--ct-text-2);
}

.total__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--ct-r-md);
  font-size: 19px;
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.search-row {
  margin: 14px 0 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 2px 10px;
}

.toolbar__count {
  font-size: 12px;
  color: var(--ct-text-3);
}

.toolbar__sort {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-chip);
  background: var(--ct-card);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ct-text-2);
  cursor: pointer;
}

.toolbar__sort ion-icon {
  font-size: 14px;
}

.list {
  background: transparent;
  padding: 0;
}

.divider {
  height: 1px;
  margin-left: 64px;
  background: var(--ct-border-soft);
}
</style>
