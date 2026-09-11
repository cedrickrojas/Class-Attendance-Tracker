<template>
  <IonModal :is-open="isOpen" @didDismiss="close">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton :disabled="saving" @click="close">
            {{ created ? 'Done' : 'Cancel' }}
          </IonButton>
        </IonButtons>
        <IonTitle>{{ student ? 'Edit Student' : 'Add Student' }}</IonTitle>
        <IonButtons v-if="!created" slot="end">
          <IonButton :strong="true" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <div class="body">
        <!-- After creating: show the generated ID, ready to hand to the student -->
        <template v-if="created">
          <AppCard class="result">
            <span class="result__icon"><IonIcon :icon="checkmarkCircleOutline" /></span>
            <p class="result__title">Student Created Successfully</p>
            <p class="result__name">{{ created.studentName }}</p>

            <p class="result__label">Student ID</p>
            <p class="result__id">{{ created.studentId }}</p>

            <IonButton expand="block" class="ct-button-secondary copy" @click="copyId">
              <IonIcon slot="start" :icon="copied ? checkmarkOutline : copyOutline" />
              {{ copied ? 'Copied' : 'Copy Student ID' }}
            </IonButton>

            <p class="result__hint">
              Give this ID to the student. They will need it to create their account.
            </p>
          </AppCard>

          <div class="actions">
            <IonButton expand="block" class="ct-button-primary" @click="startAnother">
              <IonIcon slot="start" :icon="addOutline" />
              Add Another Student
            </IonButton>
            <IonButton expand="block" class="ct-button-secondary secondary" @click="close">
              Done
            </IonButton>
          </div>
        </template>

        <!-- The form itself. There is no Student ID input: the app issues it. -->
        <template v-else>
          <div v-if="student" class="assigned">
            <span class="assigned__label">Student ID</span>
            <span class="assigned__value">{{ student.studentId }}</span>
            <span class="assigned__note">Permanent, cannot be changed</span>
          </div>

          <IonList class="ct-field-list">
            <IonItem :class="{ 'field--invalid': invalidField === 'studentName' }">
              <IonInput
                v-model="form.studentName"
                label="Full Name"
                label-placement="stacked"
                placeholder="Juan Dela Cruz"
                autocapitalize="words"
                :maxlength="80"
                :disabled="saving"
                enterkeyhint="next"
              />
            </IonItem>
            <IonItem lines="none" :class="{ 'field--invalid': invalidField === 'courseSection' }">
              <IonInput
                v-model="form.courseSection"
                label="Course / Section"
                label-placement="stacked"
                placeholder="BSIT 4-A"
                autocapitalize="characters"
                :maxlength="40"
                :disabled="saving"
                enterkeyhint="done"
              />
            </IonItem>
          </IonList>

          <p v-if="!student" class="hint">
            <IonIcon :icon="informationCircleOutline" />
            The Student ID is generated automatically when you create the student.
          </p>

          <p v-if="formError" class="form-error" role="alert">
            <IonIcon :icon="alertCircleOutline" />
            {{ formError }}
          </p>

          <div class="actions">
            <IonButton expand="block" class="ct-button-primary" :disabled="saving" @click="save">
              {{ student ? 'Save Changes' : 'Create Student' }}
            </IonButton>
            <IonButton
              expand="block"
              class="ct-button-secondary secondary"
              :disabled="saving"
              @click="close"
            >
              Cancel
            </IonButton>
          </div>
        </template>
      </div>
    </IonContent>
  </IonModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import {
  addOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  copyOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import AppCard from '@/components/AppCard.vue';
import { useClassData } from '@/composables/useClassData';
import { useFeedback } from '@/composables/useFeedback';
import type { Student } from '@/types';

/** Shared Add / Edit student form, used by the Students list and the detail page. */
const props = defineProps<{
  isOpen: boolean;
  /** Pass a student to edit, or null to add a new one. */
  student: Student | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved'): void;
}>();

const { createStudent, editStudent } = useClassData();
const { showToast, messageOf } = useFeedback();

const form = reactive({ studentName: '', courseSection: '' });
const saving = ref(false);
const formError = ref('');
const invalidField = ref<'studentName' | 'courseSection' | ''>('');
/** Set after a successful create, so the generated ID can be shown and copied. */
const created = ref<Student | null>(null);
const copied = ref(false);

// Fill the fields whenever the modal opens.
watch(
  () => [props.isOpen, props.student] as const,
  ([open]) => {
    if (!open) return;
    form.studentName = props.student?.studentName ?? '';
    form.courseSection = props.student?.courseSection ?? '';
    formError.value = '';
    invalidField.value = '';
    created.value = null;
    copied.value = false;
  },
  { immediate: true }
);

function close(): void {
  if (saving.value) return;
  emit('close');
}

/** Clears the result panel and returns to an empty form. */
function startAnother(): void {
  created.value = null;
  copied.value = false;
  form.studentName = '';
  form.courseSection = '';
  formError.value = '';
  invalidField.value = '';
}

async function copyId(): Promise<void> {
  const id = created.value?.studentId;
  if (!id) return;

  try {
    await navigator.clipboard.writeText(id);
    copied.value = true;
    await showToast(`Student ID ${id} copied.`);
  } catch {
    // Clipboard can be blocked; the ID is on screen either way.
    await showToast('Could not copy automatically - the ID is shown above.', 'info');
  }
}

/** Client-side checks so an empty form never reaches Firestore. */
function validate(): boolean {
  if (!form.studentName.trim()) {
    formError.value = 'Full name is required.';
    invalidField.value = 'studentName';
    return false;
  }
  if (!form.courseSection.trim()) {
    formError.value = 'Course / Section is required.';
    invalidField.value = 'courseSection';
    return false;
  }
  formError.value = '';
  invalidField.value = '';
  return true;
}

async function save(): Promise<void> {
  if (saving.value || !validate()) return;

  saving.value = true;
  const payload = {
    studentName: form.studentName.trim(),
    courseSection: form.courseSection.trim(),
  };

  try {
    if (props.student) {
      await editStudent(props.student.id, payload);
      emit('saved');
      emit('close');
      await showToast('Student updated successfully.');
    } else {
      // Stay open so the admin can read and copy the generated ID.
      created.value = await createStudent(payload);
      emit('saved');
      await showToast(`Student added. ID ${created.value.studentId}.`);
    }
  } catch (error) {
    // Keep the modal open so the teacher can fix the problem.
    formError.value = messageOf(error, 'Could not save the student.');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.body {
  padding: 20px 16px;
}

/* Assigned ID on the edit form ------------------------------------------ */
.assigned {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
  padding: 12px 14px;
  background: var(--ct-elevated);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-md);
}

.assigned__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.assigned__value {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.assigned__note {
  font-size: 11.5px;
  color: var(--ct-text-3);
}

/* Result panel ----------------------------------------------------------- */
.result {
  text-align: center;
}

.result__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--ct-r-md);
  margin-bottom: 14px;
  font-size: 22px;
  color: var(--ct-present);
  background: var(--ct-present-soft);
}

.result__title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--ct-text);
}

.result__name {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--ct-text-2);
}

.result__label {
  margin: 20px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.result__id {
  margin: 6px 0 16px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ct-accent);
  font-variant-numeric: tabular-nums;
}

.copy {
  --color: var(--ct-accent);
}

.result__hint {
  margin: 14px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ct-text-3);
}

/* Form ------------------------------------------------------------------- */
.field--invalid {
  --border-color: var(--ct-absent);
  --highlight-color-focused: var(--ct-absent);
}

.hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ct-text-3);
}

.hint ion-icon {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 13px;
  font-weight: 550;
  color: var(--ct-absent);
}

.form-error ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.actions {
  margin-top: 24px;
}

.secondary {
  margin-top: 10px;
}
</style>
