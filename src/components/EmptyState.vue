<template>
  <div class="empty">
    <div class="empty__icon"><IonIcon :icon="icon" /></div>
    <h2 class="empty__title">{{ title }}</h2>
    <p class="empty__message">{{ message }}</p>
    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';

/** Minimal placeholder for a list with nothing in it yet. */
defineProps<{ icon: string; title: string; message: string }>();
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 54px 24px;
}

.empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--ct-r-md);
  margin-bottom: 16px;
  font-size: 20px;
  color: var(--ct-text-2);
  background: var(--ct-elevated);
  border: 1px solid var(--ct-border);
}

.empty__title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--ct-text);
}

.empty__message {
  margin: 0;
  max-width: 260px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ct-text-2);
}

.empty__action {
  margin-top: 22px;
  width: 100%;
  max-width: 280px;
}
</style>
