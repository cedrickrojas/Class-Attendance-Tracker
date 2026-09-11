<template>
  <component :is="tag" class="app-card" :class="{ 'app-card--flush': flush }">
    <slot />
  </component>
</template>

<script setup lang="ts">
/** The single card surface used across the app: 1px border, no floating shadow. */
withDefaults(defineProps<{ tag?: string; flush?: boolean }>(), {
  tag: 'section',
  flush: false,
});
</script>

<style scoped>
.app-card {
  background: var(--ct-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-lg);
  box-shadow: var(--ct-shadow);
  padding: 16px;
}

/* For lists and rows that draw their own padding. */
.app-card--flush {
  padding: 0;
  overflow: hidden;
}
</style>
