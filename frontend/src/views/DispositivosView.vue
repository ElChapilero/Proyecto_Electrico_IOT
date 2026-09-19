<template>
  <section class="page">
    <div class="encabezado">
      <h1 class="titulo">Dispositivos</h1>
      <button class="btn-primary" @click="mostrarVincular = true">Vincular</button>
    </div>

    <p v-if="cargando" class="muted">Cargando...</p>
    <p v-else-if="predios.length === 0" class="muted">Todavía no tenés ningún predio.</p>

    <div v-else class="arbol">
      <article v-for="predio in arbol" :key="predio.id" class="predio-bloque">
        <header class="predio-header">
          <span class="badge predio">{{ predio.tipo_predio }}</span>
          <EditableName :model-value="predio.nombre" @guardar="(n) => renombrarPredio(predio, n)" />
        </header>

        <p v-if="predio.principales.length === 0" class="muted indent">Todavía no tiene paneles.</p>

        <div v-for="principal in predio.principales" :key="principal.id" class="panel-bloque principal">
          <div class="panel-header">
            <span class="badge principal">Principal</span>
            <EditableName :model-value="principal.nombre" @guardar="(n) => renombrarPanel(principal, n)" />
          </div>

          <ul v-if="principal.dispositivos.length" class="lista-dispositivos">
            <li v-for="d in principal.dispositivos" :key="d.id" class="dispositivo">
              <div class="dispositivo-cabecera">
                <EditableName :model-value="d.nombre" @guardar="(n) => renombrarDispositivo(d, n)" />
                <span class="mono uuid">{{ d.uuid_esp32 }}</span>
                <button class="mover" type="button" @click="abrirMover(d)">Mover</button>
              </div>
              <ul v-if="d.circuitos.length" class="lista-circuitos">
                <li v-for="c in d.circuitos" :key="c.id" class="circuito">
                  <span class="indice">{{ c.indice }}</span>
                  <EditableName :model-value="c.nombre" @guardar="(n) => renombrarCircuito(c, n)" />
                </li>
              </ul>
            </li>
          </ul>

          <div v-for="secundario in principal.secundarios" :key="secundario.id" class="panel-bloque secundario">
            <div class="panel-header">
              <span class="badge secundario">Secundario</span>
              <EditableName :model-value="secundario.nombre" @guardar="(n) => renombrarPanel(secundario, n)" />
            </div>
            <ul v-if="secundario.dispositivos.length" class="lista-dispositivos">
              <li v-for="d in secundario.dispositivos" :key="d.id" class="dispositivo">
                <div class="dispositivo-cabecera">
                  <EditableName :model-value="d.nombre" @guardar="(n) => renombrarDispositivo(d, n)" />
                  <span class="mono uuid">{{ d.uuid_esp32 }}</span>
                  <button class="mover" type="button" @click="abrirMover(d)">Mover</button>
                </div>
                <ul v-if="d.circuitos.length" class="lista-circuitos">
                  <li v-for="c in d.circuitos" :key="c.id" class="circuito">
                    <span class="indice">{{ c.indice }}</span>
                    <EditableName :model-value="c.nombre" @guardar="(n) => renombrarCircuito(c, n)" />
                  </li>
                </ul>
              </li>
            </ul>
            <p v-else class="muted indent">Sin dispositivos todavía.</p>
          </div>
        </div>
      </article>
    </div>

    <VincularDispositivoSheet
      v-if="mostrarVincular"
      :paneles="todosPaneles"
      @cerrar="mostrarVincular = false"
      @panel-creado="(p) => todosPaneles.push(p)"
    />

    <MoverDispositivoSheet
      v-if="dispositivoAMover"
      :dispositivo="dispositivoAMover"
      :paneles="todosPaneles"
      @cerrar="dispositivoAMover = null"
      @panel-creado="(p) => todosPaneles.push(p)"
      @movido="aplicarMovimiento"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api';
import { usePredio } from '../composables/usePredio';
import EditableName from '../components/EditableName.vue';
import VincularDispositivoSheet from '../components/VincularDispositivoSheet.vue';
import MoverDispositivoSheet from '../components/MoverDispositivoSheet.vue';

const { predios, cargarPredios } = usePredio();

const todosPaneles = ref([]);
const todosDispositivos = ref([]);
const todosCircuitos = ref([]);
const cargando = ref(true);
const mostrarVincular = ref(false);
const dispositivoAMover = ref(null);

async function cargarTodo() {
  cargando.value = true;
  try {
    await cargarPredios();
    const [paneles, dispositivos, circuitos] = await Promise.all([
      api.misPaneles(),
      api.misDispositivos(),
      api.misCircuitos(),
    ]);
    todosPaneles.value = paneles;
    todosDispositivos.value = dispositivos;
    todosCircuitos.value = circuitos;
  } finally {
    cargando.value = false;
  }
}

const arbol = computed(() =>
  predios.value.map((predio) => ({
    ...predio,
    principales: todosPaneles.value
      .filter((p) => p.id_predio === predio.id && p.tipo_panel === 'Principal')
      .map((principal) => ({
        ...principal,
        dispositivos: dispositivosDe(principal.id),
        secundarios: todosPaneles.value
          .filter((p) => p.id_panel_principal === principal.id)
          .map((secundario) => ({
            ...secundario,
            dispositivos: dispositivosDe(secundario.id),
          })),
      })),
  }))
);

function dispositivosDe(idPanel) {
  return todosDispositivos.value
    .filter((d) => d.id_panel === idPanel)
    .map((d) => ({
      ...d,
      circuitos: todosCircuitos.value.filter((c) => c.id_dispositivo === d.id),
    }));
}

async function renombrarPredio(predio, nuevoNombre) {
  try {
    const actualizado = await api.renombrarPredio(predio.id, nuevoNombre);
    const idx = predios.value.findIndex((p) => p.id === predio.id);
    if (idx !== -1) predios.value[idx] = { ...predios.value[idx], nombre: actualizado.nombre };
  } catch (e) {
    alert(e.message);
  }
}

async function renombrarPanel(panel, nuevoNombre) {
  try {
    const actualizado = await api.renombrarPanel(panel.id, nuevoNombre);
    const idx = todosPaneles.value.findIndex((p) => p.id === panel.id);
    if (idx !== -1) todosPaneles.value[idx] = { ...todosPaneles.value[idx], nombre: actualizado.nombre };
  } catch (e) {
    alert(e.message);
  }
}

async function renombrarCircuito(circuito, nuevoNombre) {
  try {
    const actualizado = await api.renombrarCircuito(circuito.id, nuevoNombre);
    const idx = todosCircuitos.value.findIndex((c) => c.id === circuito.id);
    if (idx !== -1) todosCircuitos.value[idx] = { ...todosCircuitos.value[idx], nombre: actualizado.nombre };
  } catch (e) {
    alert(e.message);
  }
}

async function renombrarDispositivo(dispositivo, nuevoNombre) {
  try {
    const actualizado = await api.renombrarDispositivo(dispositivo.id, nuevoNombre);
    const idx = todosDispositivos.value.findIndex((d) => d.id === dispositivo.id);
    if (idx !== -1) todosDispositivos.value[idx] = { ...todosDispositivos.value[idx], nombre: actualizado.nombre };
  } catch (e) {
    alert(e.message);
  }
}

function abrirMover(dispositivo) {
  dispositivoAMover.value = dispositivo;
}

// El backend devuelve el dispositivo con su id_panel nuevo; el
// resto de sus datos (predio, panel, circuitos) no vienen en esa
// respuesta, asi que los recalculamos localmente en vez de pedirle
// todo de nuevo al servidor.
function aplicarMovimiento(actualizado) {
  const idx = todosDispositivos.value.findIndex((d) => d.id === actualizado.id);
  if (idx === -1) return;

  const panelNuevo = todosPaneles.value.find((p) => p.id === actualizado.id_panel);
  const predioNuevo = panelNuevo ? predios.value.find((p) => p.id === panelNuevo.id_predio) : null;

  todosDispositivos.value[idx] = {
    ...todosDispositivos.value[idx],
    id_panel: actualizado.id_panel,
    nombre_panel: panelNuevo?.nombre,
    tipo_panel: panelNuevo?.tipo_panel,
    id_predio: predioNuevo?.id,
    nombre_predio: predioNuevo?.nombre,
  };
}

onMounted(cargarTodo);
</script>

<style scoped>
.encabezado { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-5); }
.titulo { margin: 0; font-size: 26px; }
.encabezado .btn-primary { padding: 10px 18px; font-size: 14px; flex-shrink: 0; }

.muted { color: var(--text-muted); font-size: 14px; }
.indent { padding-left: var(--space-3); }

/* --- Árbol de dispositivos --- */
.arbol { display: flex; flex-direction: column; gap: var(--space-5); }
.predio-header { display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-3); }
.predio-header :deep(.editable-name) { font-family: var(--font-display); font-weight: 600; font-size: 18px; }

.badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.badge.predio { background: var(--line); color: var(--text-muted); }
.badge.principal { background: var(--volt-teal-soft); color: var(--volt-teal-dark); }
.badge.secundario { background: var(--volt-amber-soft); color: #8a5c14; }

.panel-bloque.principal { margin-bottom: var(--space-4); padding-left: var(--space-3); border-left: 2px solid var(--volt-teal-soft); }
.panel-bloque.secundario { margin: var(--space-3) 0 var(--space-3) var(--space-4); padding-left: var(--space-3); border-left: 2px solid var(--volt-amber-soft); }
.panel-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.panel-header :deep(.editable-name) { font-weight: 600; }

.lista-dispositivos { list-style: none; margin: 0 0 var(--space-2); padding: 0; display: flex; flex-direction: column; gap: 8px; }
.dispositivo { padding: 10px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); }
.dispositivo-cabecera { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; }
.dispositivo-cabecera :deep(.editable-name) { font-weight: 600; }
.uuid { color: var(--text-muted); font-size: 12px; flex-basis: 100%; }
.mover {
  margin-left: auto;
  background: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--volt-teal-dark);
  cursor: pointer;
}
.mover:hover { background: var(--volt-teal-soft); border-color: var(--volt-teal); }

.lista-circuitos { list-style: none; margin: 8px 0 0; padding: 8px 0 0; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 4px; }
.circuito { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.circuito .indice {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--paper);
  border: 1px solid var(--line);
  font-size: 11px;
  color: var(--text-muted);
}

@media (min-width: 640px) {
  .lista-dispositivos { flex-direction: row; flex-wrap: wrap; }
  .dispositivo { flex: 1 1 260px; }
}
</style>
