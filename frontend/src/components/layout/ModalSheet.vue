<template>
  <div class="backdrop" @click.self="$emit('cerrar')">
    <div class="panel" role="dialog" aria-modal="true" :aria-label="titulo">
      <div class="handle" aria-hidden="true"></div>
      <h2 v-if="titulo">{{ titulo }}</h2>

      <div class="panel-body">
        <slot />
      </div>

      <button class="cerrar" @click="$emit('cerrar')">Cerrar</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ titulo: { type: String, default: '' } });
defineEmits(['cerrar']);
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 32, 29, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 30;
}

.panel {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
  box-shadow: var(--shadow-md);
  max-height: 80vh;
  overflow-y: auto;
}

.handle {
  width: 40px;
  height: 4px;
  background: var(--line);
  border-radius: 999px;
  margin: 0 auto var(--space-4);
}

h2 { font-size: 17px; margin-bottom: var(--space-3); }

.panel-body { margin-bottom: var(--space-4); }

.cerrar {
  width: 100%;
  background: none;
  border: 0;
  padding: 10px;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
}

@media (min-width: 640px) {
  .backdrop { align-items: center; }
  .panel { border-radius: var(--radius-lg); max-height: 70vh; }
  .handle { display: none; }
}
</style>
