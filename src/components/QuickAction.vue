<template>
  <button type="button" class="quick" @click="emit('select')">
    <span class="quick__icon"><IonIcon :icon="icon" /></span>
    <span class="quick__text">
      <span class="quick__title">{{ title }}</span>
      <span class="quick__description">{{ description }}</span>
    </span>
    <IonIcon :icon="chevronForward" class="quick__chevron" />
  </button>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { chevronForward } from 'ionicons/icons';

/** Compact action row: icon, title, one line of context. */
defineProps<{ icon: string; title: string; description: string }>();
const emit = defineEmits<{ (event: 'select'): void }>();
</script>

<style scoped>
.quick {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 14px;
  border: 0;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.quick:active {
  background: var(--ct-elevated);
}

.quick__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: var(--ct-r-sm);
  font-size: 18px;
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.quick__text {
  flex: 1;
  min-width: 0;
}

.quick__title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ct-text);
}

.quick__description {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.quick__chevron {
  font-size: 15px;
  color: var(--ct-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .quick {
    transition: none;
  }
}
</style>
