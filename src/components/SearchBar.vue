<template>
  <IonSearchbar
    class="search"
    :value="modelValue"
    :placeholder="placeholder"
    :debounce="150"
    inputmode="search"
    @ionInput="onInput"
  />
</template>

<script setup lang="ts">
import { IonSearchbar } from '@ionic/vue';

defineProps<{ modelValue: string; placeholder?: string }>();
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>();

function onInput(event: CustomEvent): void {
  emit('update:modelValue', (event.detail as { value?: string }).value ?? '');
}
</script>

<style scoped>
.search {
  --background: var(--ct-card);
  --color: var(--ct-text);
  --placeholder-color: var(--ct-text-3);
  --placeholder-opacity: 1;
  --icon-color: var(--ct-text-3);
  --clear-button-color: var(--ct-text-2);
  --border-radius: var(--ct-r-md);
  /* Hairline drawn inside the field - a border on the host reads as a double ring. */
  --box-shadow: inset 0 0 0 1px var(--ct-border);
  padding: 0;
  min-height: 44px;
}
</style>
