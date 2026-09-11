<template>
  <div class="section-header">
    <div class="section-header__text">
      <h2 class="section-header__title">{{ title }}</h2>
      <p v-if="subtitle" class="section-header__subtitle">{{ subtitle }}</p>
    </div>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
/** Title above a group of cards, with room for one trailing control. */
defineProps<{ title: string; subtitle?: string }>();
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin: 24px 2px 10px;
}

.section-header__title {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--ct-text);
}

.section-header__subtitle {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--ct-text-2);
}
</style>
