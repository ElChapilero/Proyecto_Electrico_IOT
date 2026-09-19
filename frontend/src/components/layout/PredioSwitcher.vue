<template>
  <ModalSheet titulo="Tus predios" @cerrar="$emit('cerrar')">
    <p v-if="cargandoPredios" class="muted">Cargando...</p>
    <ul v-else class="lista">
      <li v-for="p in predios" :key="p.id" class="fila" :class="{ activo: p.id === predioSeleccionado }">
        <button class="elegir" @click="seleccionarPredio(p.id)">
          <span class="nombre">
            <EditableName :model-value="p.nombre" @guardar="(nuevo) => renombrar(p, nuevo)" />
            <span class="tipo">{{ p.tipo_predio }}</span>
          </span>
          <svg v-if="p.id === predioSeleccionado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </li>
    </ul>
  </ModalSheet>
</template>

<script setup>
import { usePredio } from '../../composables/usePredio';
import { api } from '../../services/api';
import ModalSheet from './ModalSheet.vue';
import EditableName from '../EditableName.vue';

defineEmits(['cerrar']);

const { predios, predioSeleccionado, cargandoPredios, seleccionarPredio } = usePredio();

async function renombrar(predio, nuevoNombre) {
  try {
    const actualizado = await api.renombrarPredio(predio.id, nuevoNombre);
    const idx = predios.value.findIndex((x) => x.id === predio.id);
    if (idx !== -1) predios.value[idx] = { ...predios.value[idx], nombre: actualizado.nombre };
  } catch (e) {
    alert(e.message);
  }
}
</script>

<style scoped>
.muted { color: var(--text-muted); font-size: 14px; }

.lista { list-style: none; margin: 0 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: 6px; }

.fila {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}
.fila.activo { border-color: var(--volt-teal); background: var(--volt-teal-soft); }

.elegir {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: 0;
  padding: 12px 14px;
  font-size: 15px;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  min-width: 0;
}
.nombre { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.fila.activo .nombre { color: var(--volt-teal-dark); font-weight: 600; }
.tipo { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; flex-shrink: 0; }
.elegir svg { width: 18px; height: 18px; color: var(--volt-teal); flex-shrink: 0; }
</style>
