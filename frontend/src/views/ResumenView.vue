<template>
  <section class="page">
    <p class="eyebrow">{{ predioActual?.nombre || 'Tu predio' }}</p>
    <h1 class="titulo">Resumen</h1>

    <p v-if="cargando" class="muted">Cargando...</p>

    <div v-else-if="dispositivos.length === 0" class="vacio">
      <p>Todavía no hay nada que resumir acá.</p>
      <p class="muted">
        Vinculá tu primer ESP32 desde la pestaña Dispositivos y en cuanto empiece a mandar
        mediciones vas a ver acá el consumo de este predio.
      </p>
      <router-link class="btn-primary" to="/dashboard/dispositivos">Ir a Dispositivos</router-link>
    </div>

    <div v-else class="grid">
      <article class="card metrica">
        <span class="metrica-label">Hoy</span>
        <span class="metrica-valor mono">-- <small>kWh</small></span>
      </article>
      <article class="card metrica">
        <span class="metrica-label">Este mes</span>
        <span class="metrica-valor mono">-- <small>kWh</small></span>
      </article>
      <article class="card metrica acento">
        <span class="metrica-label">Dispositivos activos</span>
        <span class="metrica-valor mono">{{ dispositivos.length }}</span>
      </article>

      <p class="muted nota">
        Las gráficas en tiempo real llegan pronto — ya tenés {{ dispositivos.length }}
        dispositivo(s) mandando datos en {{ predioActual?.nombre }}.
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api';
import { usePredio } from '../composables/usePredio';

const { predioSeleccionado, predioActual } = usePredio();

const todosDispositivos = ref([]);
const cargando = ref(false);

const dispositivos = computed(() =>
  todosDispositivos.value.filter((d) => d.id_predio === predioSeleccionado.value)
);

async function cargar() {
  cargando.value = true;
  try {
    todosDispositivos.value = await api.misDispositivos();
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.eyebrow { margin: 0; font-size: 13px; font-weight: 600; color: var(--volt-teal-dark); text-transform: uppercase; letter-spacing: 0.04em; }
.titulo { margin: 2px 0 var(--space-5); font-size: 26px; }
.muted { color: var(--text-muted); font-size: 14px; }

.vacio { text-align: center; padding: var(--space-6) var(--space-4); }
.vacio p { margin: 0 0 var(--space-3); }
.vacio .btn-primary { margin-top: var(--space-3); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.metrica { grid-column: span 1; padding: var(--space-4); display: flex; flex-direction: column; gap: 6px; }
.metrica.acento { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; background: var(--volt-teal-soft); border-color: transparent; }
.metrica-label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.metrica-valor { font-size: 26px; font-weight: 600; color: var(--ink); }
.metrica-valor small { font-size: 13px; font-weight: 500; color: var(--text-muted); }
.nota { grid-column: 1 / -1; margin-top: var(--space-2); }

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
