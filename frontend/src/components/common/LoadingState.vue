<template>
  <div class="state-box" role="status">
    <span class="spinner" aria-hidden="true"></span><span>{{ message }}</span>
  </div>
</template>
<script setup>
defineProps({ message: { type: String, default: "Cargando…" } });
</script>
<style scoped>
.state-box {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 28px;
  color: var(--color-muted);
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-line);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
