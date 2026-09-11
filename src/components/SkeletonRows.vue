<template>
  <div class="skeleton" role="status" aria-label="Loading">
    <div v-for="n in count" :key="n" class="skeleton__row">
      <div class="ct-skeleton skeleton__avatar" />
      <div class="skeleton__lines">
        <div class="ct-skeleton skeleton__line skeleton__line--wide" />
        <div class="ct-skeleton skeleton__line" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Placeholder rows shown while the first load is in flight. */
withDefaults(defineProps<{ count?: number }>(), { count: 4 });
</script>

<style scoped>
.skeleton {
  background: var(--ct-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-lg);
  overflow: hidden;
}

.skeleton__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.skeleton__row + .skeleton__row {
  border-top: 1px solid var(--ct-border-soft);
}

.skeleton__avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: var(--ct-r-sm);
}

.skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.skeleton__line {
  height: 10px;
  width: 45%;
}

.skeleton__line--wide {
  width: 72%;
}
</style>
