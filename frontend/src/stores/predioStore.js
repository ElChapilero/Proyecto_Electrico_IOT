import { computed, reactive } from 'vue';
import { prediosApi } from '../services/prediosApi';
import { storage } from '../utils/storage';
import { useRealtimeStore } from './realtimeStore';

const state = reactive({ predios: [], seleccionadoId: null, cargando: false, error: '', inicializado: false });
const realtime = useRealtimeStore();
const actual = computed(() => state.predios.find((item) => item.id === state.seleccionadoId) || null);

async function load({ force = false } = {}) {
  if (state.inicializado && !force) return state.predios;
  state.cargando = true; state.error = '';
  try {
    const list = await prediosApi.list();
    state.predios = Array.isArray(list) ? list : [];
    const stored = storage.getPredioId();
    const selected = state.predios.some((item) => item.id === stored) ? stored : state.predios[0]?.id || null;
    await select(selected);
    state.inicializado = true;
    return state.predios;
  } catch (error) { state.error = error.message; throw error; } finally { state.cargando = false; }
}

async function select(id) {
  if (id === state.seleccionadoId) return;
  if (state.seleccionadoId) realtime.leaveProperty(state.seleccionadoId);
  state.seleccionadoId = id || null;
  storage.setPredioId(state.seleccionadoId);
  if (state.seleccionadoId) await realtime.joinProperty(state.seleccionadoId);
}

function clear() { if (state.seleccionadoId) realtime.leaveProperty(state.seleccionadoId); state.predios = []; state.seleccionadoId = null; state.inicializado = false; state.error = ''; storage.removePredioId(); }

export function usePredioStore() { return { state, predios: computed(() => state.predios), predioActual: actual, predioId: computed(() => state.seleccionadoId), load, select, clear }; }
