<template>
  <div class="state-box">
    <strong>{{ title }}</strong>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
<script setup>
defineProps({ title: { type: String, default: "Sin datos" }, message: String });
</script>
<style scoped>
.state-box {
  display: grid;
  gap: 8px;
  text-align: center;
  padding: 34px;
  color: var(--color-muted);
}
strong {
  color: var(--color-ink);
}
</style>
