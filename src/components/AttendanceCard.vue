<template>
  <div class="record">
    <div class="record__main">
      <div class="record__info">
        <h3 class="record__name">{{ record.studentName }}</h3>
        <p class="record__meta">
          <span v-if="record.studentId" class="record__id">{{ record.studentId }}</span>
          <span v-if="record.studentId" class="record__dot">&middot;</span>
          <span>{{ formatShortDate(record.date) }}</span>
        </p>
      </div>
      <StatusBadge :status="record.status" />
    </div>

    <p class="record__remarks">
      {{ record.remarks || 'No remarks' }}
    </p>

    <div v-if="canManage" class="record__actions">
      <button type="button" class="record__action" @click="emit('edit')">
        <IonIcon :icon="createOutline" />
        Edit
      </button>
      <button type="button" class="record__action record__action--danger" @click="emit('delete')">
        <IonIcon :icon="trashOutline" />
        Delete
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { createOutline, trashOutline } from 'ionicons/icons';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatShortDate } from '@/utils/date';
import type { AttendanceRecord } from '@/types';

withDefaults(
  defineProps<{
    record: AttendanceRecord;
    /** Only admins get edit and delete. */
    canManage?: boolean;
  }>(),
  { canManage: false }
);

const emit = defineEmits<{
  (event: 'edit'): void;
  (event: 'delete'): void;
}>();
</script>

<style scoped>
.record {
  padding: 14px;
}

.record:has(.record__actions) {
  padding-bottom: 8px;
}

.record + .record {
  border-top: 1px solid var(--ct-border-soft);
}

.record__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.record__name {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: var(--ct-text);
}

.record__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.record__id {
  font-variant-numeric: tabular-nums;
}

.record__dot {
  color: var(--ct-text-3);
}

.record__remarks {
  margin: 9px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ct-text-3);
}

.record__actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.record__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--ct-r-chip);
  background: none;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ct-text-2);
  cursor: pointer;
  transition: background-color 150ms ease;
}

.record__action ion-icon {
  font-size: 15px;
}

.record__action:active {
  background: var(--ct-elevated);
}

.record__action--danger {
  color: var(--ct-absent);
}

@media (prefers-reduced-motion: reduce) {
  .record__action {
    transition: none;
  }
}
</style>
