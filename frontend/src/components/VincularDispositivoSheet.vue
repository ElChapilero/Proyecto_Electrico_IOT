<template>
  <ModalSheet titulo="Vincular nuevo dispositivo" @cerrar="$emit('cerrar')">
    <p class="muted">
      Elegí el predio y el panel al que va a quedar conectado el ESP32, generá un código, e
      ingresalo en la página que crea el equipo al conectarse por WiFi.
    </p>

    <label class="campo">
      <span>Predio</span>
      <select v-model="predioVincular" :disabled="predios.length === 0">
        <option v-for="p in predios" :key="p.id" :value="p.id">{{ p.nombre }}</option>
      </select>
    </label>

    <button class="link" type="button" @click="mostrarNuevoPredio = !mostrarNuevoPredio">
      {{ mostrarNuevoPredio ? 'Cancelar' : '+ Crear un predio nuevo' }}
    </button>

    <form v-if="mostrarNuevoPredio" class="nuevo-inline" @submit.prevent="crearPredioNuevo">
      <input v-model="nuevoPredioNombre" placeholder="Nombre del predio" />
      <button type="submit" class="btn-primary" :disabled="creandoPredio">
        {{ creandoPredio ? 'Creando...' : 'Crear predio' }}
      </button>
    </form>

    <label class="campo">
      <span>Panel</span>
      <select v-model="panelVincular" :disabled="opcionesPanel.length === 0">
        <option value="" disabled>Elegí un panel</option>
        <option v-for="op in opcionesPanel" :key="op.value" :value="op.value">{{ op.label }}</option>
      </select>
    </label>

    <p v-if="predioVincular && opcionesPanel.length === 0" class="muted aviso">
      Este predio todavía no tiene ningún panel.
    </p>

    <button class="link" type="button" @click="mostrarNuevoPanel = !mostrarNuevoPanel">
      {{ mostrarNuevoPanel ? 'Cancelar' : '+ Crear un panel nuevo' }}
    </button>

    <form v-if="mostrarNuevoPanel" class="nuevo-panel" @submit.prevent="crearPanelNuevo">
      <div class="tipo-toggle">
        <button type="button" :class="{ activo: nuevoPanelTipo === 'Principal' }" @click="nuevoPanelTipo = 'Principal'">
          Principal
        </button>
        <button
          type="button"
          :class="{ activo: nuevoPanelTipo === 'Secundario' }"
          :disabled="principalesDelPredio.length === 0"
          @click="nuevoPanelTipo = 'Secundario'"
        >
          Secundario
        </button>
      </div>

      <select v-if="nuevoPanelTipo === 'Secundario'" v-model="nuevoPanelPrincipalId">
        <option value="" disabled>¿De qué panel principal cuelga?</option>
        <option v-for="pr in principalesDelPredio" :key="pr.id" :value="pr.id">{{ pr.nombre }}</option>
      </select>

      <input v-model="nuevoPanelNombre" placeholder="Nombre del panel" />

      <button type="submit" class="btn-primary" :disabled="creandoPanel">
        {{ creandoPanel ? 'Creando...' : 'Crear panel' }}
      </button>
    </form>

    <button class="btn-primary generar" @click="generarCodigo" :disabled="generando || !panelVincular">
      {{ generando ? 'Generando...' : 'Generar código' }}
    </button>

    <div v-if="codigo" class="codigo-box">
      <div class="codigo mono">{{ codigo }}</div>
      <p class="muted">Válido por {{ minutosRestantes }} minuto(s)</p>
    </div>
  </ModalSheet>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { api } from '../services/api';
import { usePredio } from '../composables/usePredio';
import ModalSheet from './layout/ModalSheet.vue';

// "paneles" sigue viniendo del padre (DispositivosView ya los
// tiene cargados para armar el arbol); "predios" en cambio se lee
// directo del composable compartido, porque ahora esta ventana
// tambien puede CREAR predios y asi el cambio se ve reflejado en
// todos lados (esta lista, Resumen) sin ida y vuelta de props.
const props = defineProps({
  paneles: { type: Array, default: () => [] },
});
const emit = defineEmits(['cerrar', 'panel-creado']);

const { predios, predioSeleccionado, crearPredio } = usePredio();

const predioVincular = ref(predioSeleccionado.value || predios.value[0]?.id || '');
const panelVincular = ref('');

// --- Crear un predio nuevo sin salir de esta ventana ---
const mostrarNuevoPredio = ref(false);
const nuevoPredioNombre = ref('');
const creandoPredio = ref(false);

async function crearPredioNuevo() {
  if (!nuevoPredioNombre.value.trim()) return;
  creandoPredio.value = true;
  try {
    const nuevo = await crearPredio(nuevoPredioNombre.value.trim(), 'Casa');
    predioVincular.value = nuevo.id;
    nuevoPredioNombre.value = '';
    mostrarNuevoPredio.value = false;
  } catch (e) {
    alert(e.message);
  } finally {
    creandoPredio.value = false;
  }
}

const panelesDelPredio = computed(() => props.paneles.filter((p) => p.id_predio === predioVincular.value));
const principalesDelPredio = computed(() => panelesDelPredio.value.filter((p) => p.tipo_panel === 'Principal'));

// Un solo <select> con los paneles del predio, en orden: cada
// Principal seguido de sus Secundarios (indentados con "↳").
const opcionesPanel = computed(() => {
  const opciones = [];
  for (const principal of principalesDelPredio.value) {
    opciones.push({ value: principal.id, label: `Principal — ${principal.nombre}` });
    for (const secundario of panelesDelPredio.value.filter((p) => p.id_panel_principal === principal.id)) {
      opciones.push({ value: secundario.id, label: `   ↳ Secundario — ${secundario.nombre}` });
    }
  }
  return opciones;
});

watch(predioVincular, () => {
  panelVincular.value = '';
  codigo.value = '';
  clearInterval(intervalo);
  mostrarNuevoPanel.value = false;
});

// --- Crear un panel nuevo sin salir de esta ventana ---
const mostrarNuevoPanel = ref(false);
const nuevoPanelNombre = ref('');
const nuevoPanelTipo = ref('Principal');
const nuevoPanelPrincipalId = ref('');
const creandoPanel = ref(false);

async function crearPanelNuevo() {
  if (!nuevoPanelNombre.value.trim()) return;
  if (nuevoPanelTipo.value === 'Secundario' && !nuevoPanelPrincipalId.value) {
    alert('Elegí a qué panel principal pertenece');
    return;
  }

  creandoPanel.value = true;
  try {
    const datos =
      nuevoPanelTipo.value === 'Principal'
        ? { nombre: nuevoPanelNombre.value.trim(), tipo_panel: 'Principal', id_predio: predioVincular.value }
        : { nombre: nuevoPanelNombre.value.trim(), tipo_panel: 'Secundario', id_panel_principal: nuevoPanelPrincipalId.value };

    const nuevo = await api.crearPanel(datos);
    emit('panel-creado', nuevo);
    panelVincular.value = nuevo.id;

    nuevoPanelNombre.value = '';
    nuevoPanelPrincipalId.value = '';
    mostrarNuevoPanel.value = false;
  } catch (e) {
    alert(e.message);
  } finally {
    creandoPanel.value = false;
  }
}

// --- Generar código de vinculación para el panel elegido ---
const codigo = ref('');
const generando = ref(false);
const expiraEn = ref(null);
const minutosRestantes = ref(0);
let intervalo = null;

async function generarCodigo() {
  if (!panelVincular.value) return;
  generando.value = true;
  try {
    const respuesta = await api.generarCodigo(panelVincular.value);
    codigo.value = respuesta.codigo;
    expiraEn.value = new Date(respuesta.expira_en);
    actualizarCuentaRegresiva();
  } catch (e) {
    alert(e.message);
  } finally {
    generando.value = false;
  }
}

function actualizarCuentaRegresiva() {
  clearInterval(intervalo);
  intervalo = setInterval(() => {
    if (!expiraEn.value) return;
    const restante = Math.max(0, Math.round((expiraEn.value - new Date()) / 60000));
    minutosRestantes.value = restante;
    if (restante <= 0) {
      codigo.value = '';
      clearInterval(intervalo);
    }
  }, 1000);
}

onUnmounted(() => clearInterval(intervalo));
</script>

<style scoped>
.muted { color: var(--text-muted); font-size: 14px; }

.campo { display: block; margin-top: var(--space-3); }
.campo span { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
.campo select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--surface);
  color: var(--ink);
}
.aviso { margin-top: 6px; }

.link { background: none; border: 0; color: var(--volt-teal); font-size: 13px; font-weight: 600; padding: 0; margin-top: var(--space-4); cursor: pointer; }

.nuevo-inline { margin-top: var(--space-3); display: flex; gap: 8px; }
.nuevo-inline input { flex: 1; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 14px; }
.nuevo-inline .btn-primary { padding: 10px 16px; font-size: 14px; white-space: nowrap; }

.nuevo-panel { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 8px; }
.nuevo-panel select,
.nuevo-panel input { padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 14px; }

.tipo-toggle { display: flex; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
.tipo-toggle button { flex: 1; padding: 8px; background: var(--surface); border: 0; font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; }
.tipo-toggle button.activo { background: var(--volt-teal); color: #fff; }
.tipo-toggle button:disabled { opacity: 0.4; cursor: not-allowed; }

.generar { width: 100%; margin-top: var(--space-4); }

.codigo-box { margin-top: var(--space-4); text-align: center; background: var(--volt-teal-soft); border-radius: var(--radius-sm); padding: var(--space-4); }
.codigo { font-size: 32px; font-weight: 600; letter-spacing: 6px; color: var(--volt-teal-dark); }
</style>
