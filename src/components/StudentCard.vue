<template>
  <IonItemSliding ref="slidingRef">
    <IonItem button :detail="false" lines="none" class="row" @click="emit('view')">
      <div class="row__avatar" slot="start">{{ initials }}</div>

      <IonLabel>
        <h2 class="row__name">{{ student.studentName }}</h2>
        <p class="row__meta">
          <span class="row__id">{{ student.studentId }}</span>
          <span class="row__dot">&middot;</span>
          <span>{{ student.courseSection }}</span>
        </p>
      </IonLabel>

      <div class="row__trail" slot="end">
        <span v-if="recordCount > 0" class="row__rate">{{ rate }}%</span>
        <span class="row__records">
          {{ recordLabel }}
        </span>
      </div>
      <IonIcon :icon="chevronForward" class="row__chevron" slot="end" />
    </IonItem>

    <IonItemOptions v-if="canManage" side="end">
      <IonItemOption color="medium" @click="handle('edit')">
        <IonIcon slot="icon-only" :icon="createOutline" />
      </IonItemOption>
      <IonItemOption color="danger" @click="handle('delete')">
        <IonIcon slot="icon-only" :icon="trashOutline" />
      </IonItemOption>
    </IonItemOptions>
  </IonItemSliding>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
} from '@ionic/vue';
import { chevronForward, createOutline, trashOutline } from 'ionicons/icons';
import type { Student } from '@/types';

const props = withDefaults(
  defineProps<{
    student: Student;
    /** Attendance rate in percent (0 when the student has no records yet). */
    rate: number;
    recordCount: number;
    /** Admins get the swipe actions; students see a read-only row. */
    canManage?: boolean;
  }>(),
  { canManage: false }
);

const emit = defineEmits<{
  (event: 'view'): void;
  (event: 'edit'): void;
  (event: 'delete'): void;
}>();

const slidingRef = ref<InstanceType<typeof IonItemSliding> | null>(null);

/** Swipe actions close themselves before the page reacts. */
async function handle(action: 'edit' | 'delete') {
  await slidingRef.value?.$el?.close?.();
  if (action === 'edit') emit('edit');
  else emit('delete');
}

/** "No records" / "1 record" / "12 records". */
const recordLabel = computed(() => {
  if (props.recordCount === 0) return 'No records';
  return `${props.recordCount} record${props.recordCount === 1 ? '' : 's'}`;
});

const initials = computed(() => {
  const parts = props.student.studentName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});
</script>

<style scoped>
.row {
  --background: var(--ct-card);
  --background-activated: var(--ct-elevated);
  --padding-start: 14px;
  --inner-padding-end: 12px;
  --min-height: 66px;
}

.row__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-right: 12px;
  border-radius: var(--ct-r-sm);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.row__name {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: var(--ct-text);
}

.row__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.row__id {
  font-variant-numeric: tabular-nums;
  font-weight: 550;
}

.row__dot {
  color: var(--ct-text-3);
}

.row__trail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  margin-right: 6px;
}

.row__rate {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ct-accent);
  font-variant-numeric: tabular-nums;
}

.row__records {
  font-size: 11px;
  color: var(--ct-text-3);
}

.row__chevron {
  font-size: 14px;
  color: var(--ct-text-3);
}
</style>
