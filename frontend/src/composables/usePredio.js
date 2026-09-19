// composables/usePredio.js

import { ref, computed } from 'vue';
import { api } from '../services/api';

const predios = ref([]);
const predioSeleccionado = ref('');
const cargandoPredios = ref(false);
const yaCargados = ref(false);

const predioActual = computed(
  () => predios.value.find((p) => p.id === predioSeleccionado.value) || null
);

async function cargarPredios({ forzar = false } = {}) {
  if (yaCargados.value && !forzar) return;
  cargandoPredios.value = true;
  try {
    predios.value = await api.misPredios();
    if (predios.value.length > 0 && !predioSeleccionado.value) {
      predioSeleccionado.value = predios.value[0].id;
    }
    yaCargados.value = true;
  } finally {
    cargandoPredios.value = false;
  }
}

async function crearPredio(nombre, tipoPredio) {
  const nuevo = await api.crearPredio(nombre, tipoPredio);
  predios.value.push(nuevo);
  predioSeleccionado.value = nuevo.id;
  return nuevo;
}

function seleccionarPredio(id) {
  predioSeleccionado.value = id;
}

export function usePredio() {
  return {
    predios,
    predioSeleccionado,
    predioActual,
    cargandoPredios,
    cargarPredios,
    crearPredio,
    seleccionarPredio,
  };
}
