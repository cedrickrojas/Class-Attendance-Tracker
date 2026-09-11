<template>
  <div class="stat" :class="`stat--${tone}`">
    <div class="stat__head">
      <span v-if="icon" class="stat__icon"><IonIcon :icon="icon" /></span>
      <span class="stat__label">{{ label }}</span>
    </div>
    <div class="stat__value">
      {{ value }}<span v-if="suffix" class="stat__suffix">{{ suffix }}</span>
    </div>
    <div v-if="caption" class="stat__caption">{{ caption }}</div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';

/**
 * One statistic. The status colour tints only the icon and the accent line -
 * never the whole card - and the label always states what the number means.
 */
withDefaults(
  defineProps<{
    label: string;
    value: number | string;
    tone?: 'neutral' | 'present' | 'absent' | 'late' | 'excused' | 'accent';
    icon?: string;
    suffix?: string;
    caption?: string;
  }>(),
  { tone: 'neutral', icon: undefined, suffix: undefined, caption: undefined }
);
</script>

<style scoped>
.stat {
  position: relative;
  padding: 14px;
  background: var(--ct-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-lg);
  overflow: hidden;
}

/* Thin top accent instead of a coloured surface. */
.stat::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: var(--accent, transparent);
  opacity: 0.9;
}

.stat__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  font-size: 14px;
  color: var(--accent, var(--ct-text-2));
  background: var(--accent-soft, var(--ct-elevated));
}

.stat__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ct-text-2);
}

.stat__value {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.stat__suffix {
  font-size: 17px;
  font-weight: 650;
  margin-left: 1px;
  color: var(--ct-text-2);
}

.stat__caption {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ct-text-3);
}

.stat--present {
  --accent: var(--ct-present);
  --accent-soft: var(--ct-present-soft);
}
.stat--absent {
  --accent: var(--ct-absent);
  --accent-soft: var(--ct-absent-soft);
}
.stat--late {
  --accent: var(--ct-late);
  --accent-soft: var(--ct-late-soft);
}
.stat--excused {
  --accent: var(--ct-excused);
  --accent-soft: var(--ct-excused-soft);
}
.stat--accent {
  --accent: var(--ct-accent);
  --accent-soft: var(--ct-accent-soft);
}
</style>
