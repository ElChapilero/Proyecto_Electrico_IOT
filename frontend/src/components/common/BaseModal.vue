<template>
  <div class="backdrop" role="presentation" @click.self="$emit('close')">
    <section class="modal" role="dialog" aria-modal="true" :aria-label="title">
      <header>
        <h2>{{ title }}</h2>
        <button type="button" aria-label="Cerrar" @click="$emit('close')">
          ×
        </button>
      </header>
      <slot />
    </section>
  </div>
</template>
<script setup>
defineProps({ title: { type: String, default: "Confirmación" } });
defineEmits(["close"]);
</script>
<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(16, 32, 29, 0.38);
}
.modal {
  width: min(100%, 520px);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-md);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
header button {
  border: 0;
  background: transparent;
  font-size: 24px;
  color: var(--color-muted);
}
</style>
