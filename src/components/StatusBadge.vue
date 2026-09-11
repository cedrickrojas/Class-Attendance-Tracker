<template>
  <span class="ct-status" :class="`ct-status--${status.toLowerCase()}`">
    <IonIcon :icon="icon" />
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  checkmarkCircle,
  closeCircle,
  documentTextOutline,
  timeOutline,
} from 'ionicons/icons';
import type { AttendanceStatus } from '@/types';

/**
 * Attendance status chip. The icon and the word travel with the colour so the
 * status is readable without relying on hue.
 */
const props = defineProps<{ status: AttendanceStatus }>();

const icon = computed(() => {
  if (props.status === 'Present') return checkmarkCircle;
  if (props.status === 'Absent') return closeCircle;
  if (props.status === 'Late') return timeOutline;
  return documentTextOutline;
});
</script>
