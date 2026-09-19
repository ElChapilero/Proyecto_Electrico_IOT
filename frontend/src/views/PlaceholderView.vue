<template>
  <section class="page">
    <h1 class="titulo">{{ titulo }}</h1>
    <div class="vacio">
      <p class="muted">{{ mensaje }}</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  titulo: { type: String, required: true },
  mensaje: { type: String, default: 'Todavía no está disponible — lo sumamos en un próximo paso.' },
});
</script>

<style scoped>
.titulo { margin: 2px 0 var(--space-5); font-size: 26px; }
.muted { color: var(--text-muted); font-size: 14px; }
.vacio { text-align: center; padding: var(--space-7) var(--space-4); }
.vacio p { margin: 0; }
</style>
