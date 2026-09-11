<template>
  <!-- Shown only if the Firebase config in src/firebase.ts is incomplete -->
  <div v-if="!isFirebaseConfigured" class="notice notice--warning">
    <IonIcon :icon="warningOutline" />
    <div>
      <strong>Firebase is not connected.</strong>
      Add your Firebase web config to <code>src/firebase.ts</code>, then restart the app.
    </div>
  </div>

  <!-- Shown when a load failed (offline, rules, etc.) -->
  <div v-else-if="loadError" class="notice notice--error">
    <IonIcon :icon="cloudOfflineOutline" />
    <div>
      <strong>Unable to load data.</strong>
      {{ loadError }}
      <button type="button" class="notice__retry" @click="emit('retry')">Try Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline, warningOutline } from 'ionicons/icons';
import { useClassData } from '@/composables/useClassData';
import { isFirebaseConfigured } from '@/firebase';

const emit = defineEmits<{ (event: 'retry'): void }>();

const { loadError } = useClassData();
</script>

<style scoped>
.notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border-radius: var(--ct-r-md);
  border: 1px solid;
  padding: 12px 13px;
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.5;
}

.notice strong {
  display: block;
  font-weight: 650;
}

.notice ion-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.notice code {
  font-size: 12px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(141, 153, 168, 0.18);
}

.notice__retry {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  border: 1px solid currentColor;
  border-radius: var(--ct-r-chip);
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 650;
  color: inherit;
  cursor: pointer;
}

.notice--warning {
  color: var(--ct-late);
  background: var(--ct-late-soft);
  border-color: var(--ct-late-soft);
}

.notice--error {
  color: var(--ct-absent);
  background: var(--ct-absent-soft);
  border-color: var(--ct-absent-soft);
}
</style>
