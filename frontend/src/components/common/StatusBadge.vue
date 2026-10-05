<template>
  <span class="badge" :class="`badge-${tone}`"
    ><slot>{{ label }}</slot></span
  >
</template>
<script setup>
defineProps({ label: String, tone: { type: String, default: "neutral" } });
</script>
<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: #eef2f1;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}
.badge-success {
  background: #e9f6ee;
  color: var(--color-success);
}
.badge-warning {
  background: #fff5e3;
  color: var(--color-warning);
}
.badge-danger {
  background: #fbeceb;
  color: var(--color-danger);
}
</style>
