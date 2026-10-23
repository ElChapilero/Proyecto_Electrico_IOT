<template>
  <div class="devices-view">
    <header class="page-heading">
      <div>
        <span class="eyebrow">Administración eléctrica</span>
        <h2>Dispositivos y estructura</h2>
        <p>
          Organiza paneles, ESP32 y circuitos de
          {{ predio.predioActual.value?.nombre || "tu predio" }}.
        </p>
      </div>
      <div class="heading-actions">
        <BaseButton variant="ghost" @click="openCreatePropertyModal"
          >＋ Agregar un predio</BaseButton
        ><BaseButton
          :disabled="!isAdmin || !panels.length"
          @click="openLinkModal"
          >⌁ Vincular dispositivo</BaseButton
        >
      </div>
    </header>
    <ErrorState
      v-if="error"
      :message="error"
      retry
      @retry="loadStructure"
    /><LoadingState
      v-else-if="loading"
      message="Cargando estructura eléctrica…"
    /><EmptyState
      v-else-if="!predio.predioId.value"
      title="Selecciona un predio"
      message="Elige un predio en la barra superior para administrar sus dispositivos."
    />
    <section v-else class="structure-card page-card">
      <div class="structure-toolbar">
        <div>
          <span class="eyebrow">Vista principal</span
          ><strong
            >{{ panels.length }} panel{{
              panels.length === 1 ? "" : "es"
            }}</strong
          >
        </div>
        <span class="live-dot">● Sincronizado en tiempo real</span>
      </div>
      <EmptyState
        v-if="!panels.length"
        title="Este predio aún no tiene paneles"
        message="Agrega un panel principal para comenzar a construir la estructura."
      />
      <ul v-else class="tree root-tree">
        <li>
          <div
            class="tree-node property-node"
            :class="{ selected: selected?.kind === 'property' }"
            @click="selectNode({ kind: 'property' })"
          >
            <span class="node-icon">⌂</span
            ><span class="node-copy"
              ><strong>{{ predio.predioActual.value?.nombre }}</strong
              ><small>Predio</small></span
            >
            <div class="node-actions">
              <button v-if="isAdmin" @click.stop="editProperty">
                Renombrar</button
              ><button v-if="isAdmin" @click.stop="openPanelModal(null)">
                ＋ Panel principal
              </button>
            </div>
          </div>
          <ul class="tree children">
            <li v-for="panel in principalPanels" :key="panel.id">
              <PanelNode
                :panel="panel"
                :all-panels="panels"
                :devices-by-panel="devicesByPanel"
                :circuits-by-device="circuitsByDevice"
                :selected="selected"
                :is-admin="isAdmin"
                @select="selectNode"
                @rename-panel="renamePanel"
                @add-secondary="openPanelModal"
                @delete-panel="askDeletePanel"
                @rename-device="renameDevice"
                @move-device="moveDevice"
                @delete-device="askDeleteDevice"
                @rename-circuit="renameCircuit"
                @delete-circuit="askDeleteCircuit"
              />
            </li>
          </ul>
        </li>
      </ul>
    </section>
    <BaseModal v-if="modal" :title="modal.title" @close="closeModal"
      ><form class="modal-form" @submit.prevent="submitModal">
        <p v-if="modal.type === 'link'">
          Selecciona el panel al que deseas vincular el ESP32. La ruta completa
          te ayudará a elegir el principal correcto.
        </p>
        <BaseInput
          v-if="
            [
              'property',
              'property-create',
              'panel',
              'panel-edit',
              'device',
              'circuit',
            ].includes(modal.type)
          "
          v-model="form.name"
          :label="
            modal.type === 'property' || modal.type === 'property-create'
              ? 'Nombre del predio'
              : 'Nombre'
          "
          required
        /><label v-if="modal.type === 'panel'" class="field"
          ><span>Tipo de panel</span
          ><select v-model="form.panelType">
            <option value="Principal">Panel principal</option>
            <option value="Secundario">Panel secundario</option>
          </select></label
        ><label
          v-if="modal.type === 'panel' && form.panelType === 'Secundario'"
          class="field"
          ><span>Seleccionar panel donde va ubicado</span
          ><select v-model="form.parentId" required>
            <option disabled value="">Selecciona un panel principal</option>
            <option
              v-for="panel in principalPanels"
              :key="panel.id"
              :value="panel.id"
            >
              {{ panel.nombre }}
            </option>
          </select></label
        ><label v-if="modal.type === 'link'" class="field"
          ><span>Panel destino</span
          ><select v-model="form.panelId" required>
            <option disabled value="">Selecciona un panel</option>
            <option v-for="panel in panels" :key="panel.id" :value="panel.id">
              {{ panelPath(panel) }}
            </option>
          </select></label
        ><label v-if="modal.type === 'move'" class="field"
          ><span>Panel destino</span
          ><select v-model="form.panelId" required>
            <option v-for="panel in panels" :key="panel.id" :value="panel.id">
              {{ panelPath(panel) }}
            </option>
          </select></label
        >
        <div v-if="modal.type === 'link' && generatedCode" class="code-box">
          <span>Código</span><strong>{{ generatedCode.codigo }}</strong
          ><small
            >Creado: {{ formatDate(generatedCode.creado_en) }} · Expira:
            {{ formatDate(generatedCode.expira_en) }}</small
          ><small>Usado: {{ generatedCode.usado ? "true" : "false" }}</small>
        </div>
        <div v-if="modal.message" class="alert alert-error">
          {{ modal.message }}
        </div>
        <div class="modal-actions">
          <BaseButton variant="ghost" type="button" @click="closeModal"
            >Cerrar</BaseButton
          ><BaseButton type="submit" :disabled="modal.busy">{{
            modal.type === "link"
              ? generatedCode
                ? "Generar otro código"
                : "Generar código"
              : "Guardar"
          }}</BaseButton>
        </div>
      </form></BaseModal
    >
    <ConfirmDialog
      v-if="confirm"
      :title="confirm.title"
      :message="confirm.message"
      @cancel="confirm = null"
      @confirm="confirm.action"
    />
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseInput from "../components/common/BaseInput.vue";
import BaseModal from "../components/common/BaseModal.vue";
import ConfirmDialog from "../components/common/ConfirmDialog.vue";
import EmptyState from "../components/common/EmptyState.vue";
import ErrorState from "../components/common/ErrorState.vue";
import LoadingState from "../components/common/LoadingState.vue";
import PanelNode from "../components/devices/PanelNode.vue";
import { dispositivosApi } from "../services/dispositivosApi";
import { prediosApi } from "../services/prediosApi";
import { usePermissions } from "../composables/usePermissions";
import { usePredioStore } from "../stores/predioStore";
import { useRealtimeStore } from "../stores/realtimeStore";
const predio = usePredioStore();
const { esAdministrador: isAdmin } = usePermissions();
const realtime = useRealtimeStore();
const panels = ref([]);
const devicesByPanel = ref({});
const circuitsByDevice = ref({});
const loading = ref(false);
const error = ref("");
const selected = ref(null);
const modal = ref(null);
const confirm = ref(null);
const generatedCode = ref(null);
const form = reactive({
  name: "",
  panelType: "Principal",
  parentId: "",
  panelId: "",
});
let refreshTimer;
const principalPanels = computed(() =>
  panels.value.filter((p) => p.tipo_panel === "Principal"),
);
const panelPath = (panel) =>
  panel.tipo_panel === "Secundario"
    ? `${panels.value.find((p) => p.id === panel.id_panel_principal)?.nombre || "Principal"} / ${panel.nombre}`
    : panel.nombre;
function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
async function loadStructure({ silent = false } = {}) {
  if (!predio.predioId.value || loading.value) return;
  if (!silent) loading.value = true;
  error.value = "";
  try {
    const nextPanels =
      (await dispositivosApi.listarPaneles(predio.predioId.value)) || [];
    const entries = await Promise.all(
      nextPanels.map(async (p) => [
        p.id,
        await dispositivosApi.listarDispositivos(p.id),
      ]),
    );
    const nextDevices = Object.fromEntries(entries);
    const devices = entries.flatMap(([, list]) => list || []);
    const circuitEntries = await Promise.all(
      devices.map(async (d) => [
        d.id,
        await dispositivosApi.listarCircuitos(d.id),
      ]),
    );
    const nextCircuits = Object.fromEntries(circuitEntries);
    const nextSignature = JSON.stringify({
      panels: nextPanels,
      devices: nextDevices,
      circuits: nextCircuits,
    });
    const currentSignature = JSON.stringify({
      panels: panels.value,
      devices: devicesByPanel.value,
      circuits: circuitsByDevice.value,
    });
    if (nextSignature !== currentSignature) {
      panels.value = nextPanels;
      devicesByPanel.value = nextDevices;
      circuitsByDevice.value = nextCircuits;
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    if (!silent) loading.value = false;
  }
}
async function refreshStructure() {
  await predio.refresh();
  await loadStructure({ silent: true });
}
function selectNode(node) {
  selected.value = node;
}
function openModal(type, title, data = {}) {
  Object.assign(form, {
    name: data.name || "",
    panelType: data.panelType || "Principal",
    parentId: data.parentId || "",
    panelId: data.panelId || "",
  });
  generatedCode.value = null;
  modal.value = { type, title, ...data };
}
function closeModal() {
  modal.value = null;
  generatedCode.value = null;
}
function openPropertyModal() {
  openModal("property", "Renombrar predio", {
    name: predio.predioActual.value?.nombre,
  });
}
function openCreatePropertyModal() {
  openModal("property-create", "Agregar predio");
}
function openPanelModal(parentId) {
  openModal(
    "panel",
    parentId ? "Agregar panel secundario" : "Agregar panel principal",
    {
      parentId: parentId || "",
      panelType: parentId ? "Secundario" : "Principal",
    },
  );
}
function openLinkModal() {
  openModal("link", "Vincular dispositivo");
}
function editProperty() {
  openPropertyModal();
}
function editItem(type, item, title) {
  openModal(type, title, {
    itemId: item.id,
    name: item.nombre,
    panelId: item.id_panel,
  });
}
function renamePanel(panel) {
  editItem("panel-edit", panel, "Renombrar panel");
}
function renameDevice(device) {
  editItem("device", device, "Renombrar dispositivo");
}
function moveDevice(device) {
  openModal("move", "Mover dispositivo", {
    itemId: device.id,
    panelId: device.id_panel,
  });
}
function renameCircuit(circuit) {
  editItem("circuit", circuit, "Renombrar circuito");
}
async function submitModal() {
  if (!modal.value) return;
  modal.value.busy = true;
  modal.value.message = "";
  try {
    const type = modal.value.type;
    if (type === "link")
      generatedCode.value = await dispositivosApi.generarCodigo(form.panelId);
    else if (type === "property-create") {
      const created = await prediosApi.create({
        nombre: form.name,
        tipo_predio: "Casa",
      });
      await predio.load({ force: true });
      if (created?.id) await predio.select(created.id);
      closeModal();
    } else if (type === "property") {
      await prediosApi.update(predio.predioId.value, { nombre: form.name });
      await predio.load({ force: true });
      closeModal();
    } else if (type === "panel") {
      await dispositivosApi.crearPanel(predio.predioId.value, {
        nombre: form.name,
        tipo_panel: form.panelType,
        id_panel_principal:
          form.panelType === "Secundario" ? form.parentId : undefined,
      });
      closeModal();
      await loadStructure();
    } else if (type === "panel-edit") {
      await dispositivosApi.actualizarPanel(modal.value.itemId, {
        nombre: form.name,
      });
      closeModal();
      await loadStructure();
    } else if (type === "device") {
      await dispositivosApi.actualizarDispositivo(modal.value.itemId, {
        nombre: form.name,
      });
      closeModal();
      await loadStructure();
    } else if (type === "move") {
      await dispositivosApi.actualizarDispositivo(modal.value.itemId, {
        id_panel: form.panelId,
      });
      closeModal();
      await loadStructure();
    } else if (type === "circuit") {
      await dispositivosApi.actualizarCircuito(modal.value.itemId, {
        nombre: form.name,
      });
      closeModal();
      await loadStructure();
    }
  } catch (e) {
    modal.value.message = e.message;
  } finally {
    if (modal.value) modal.value.busy = false;
  }
}
function askDeletePanel(item) {
  confirm.value = {
    title: "Eliminar panel",
    message: `¿Eliminar “${item.nombre}”? Solo será posible si no tiene elementos dependientes.`,
    action: () => deletePanel(item),
  };
}
function askDeleteDevice(item) {
  confirm.value = {
    title: "Eliminar dispositivo",
    message: `¿Eliminar “${item.nombre}” y sus circuitos?`,
    action: () => deleteDevice(item),
  };
}
function askDeleteCircuit(item) {
  confirm.value = {
    title: "Eliminar circuito",
    message: `¿Eliminar “${item.nombre}”?`,
    action: () => deleteCircuit(item),
  };
}
async function deletePanel(item) {
  confirm.value = null;
  try {
    await dispositivosApi.eliminarPanel(item.id);
    await loadStructure();
  } catch (e) {
    error.value = e.message;
  }
}
async function deleteDevice(item) {
  confirm.value = null;
  try {
    await dispositivosApi.eliminarDispositivo(item.id);
    await loadStructure();
  } catch (e) {
    error.value = e.message;
  }
}
async function deleteCircuit(item) {
  confirm.value = null;
  try {
    await dispositivosApi.eliminarCircuito(item.id);
    await loadStructure();
  } catch (e) {
    error.value = e.message;
  }
}
function onStructureChanged(payload) {
  if (payload?.predioId === predio.predioId.value) refreshStructure();
}
watch(
  () => predio.predioId.value,
  () => loadStructure(),
);
onMounted(() => {
  loadStructure();
  refreshTimer = setInterval(refreshStructure, 5000);
  realtime.onStructureChanged?.(onStructureChanged);
});
onUnmounted(() => {
  clearInterval(refreshTimer);
  realtime.offStructureChanged?.(onStructureChanged);
});
</script>
<style scoped>
.devices-view {
  display: grid;
  gap: 20px;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.page-heading h2 {
  color: #eaf3ff;
  font-size: 30px;
  margin-top: 8px;
}
.page-heading p {
  color: var(--color-muted);
  font-size: 14px;
  margin-top: 8px;
}
.heading-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.structure-card {
  padding: 20px;
}
.structure-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 15px;
}
.structure-toolbar div {
  display: grid;
  gap: 5px;
}
.structure-toolbar strong {
  color: #fff;
  font-size: 14px;
}
.live-dot {
  color: var(--color-success);
  font-size: 11px;
}
.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.children {
  margin-left: 25px;
  border-left: 1px solid #35506c;
  padding-left: 18px;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 58px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  margin: 12px 0;
  cursor: pointer;
  border: 0;
}
.property-node {
  background: rgba(23, 36, 55, 0.72);
}
.tree-node:hover,
.tree-node.selected {
  background: rgba(113, 173, 255, 0.16);
}
.node-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}
.node-copy {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.node-copy strong {
  color: #fff;
  font-size: 14px;
}
.node-copy small {
  color: #fff;
  font-size: 11px;
}
.node-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.node-actions button {
  min-height: 34px;
  padding: 7px 11px;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  color: #081321;
  font-size: 11px;
  font-weight: 600;
}
.node-actions button:hover {
  background: #8fc0ff;
  border-color: #8fc0ff;
}
.modal-form {
  display: grid;
  gap: 14px;
}
.modal-form p {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.code-box {
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid rgba(113, 173, 255, 0.35);
  border-radius: var(--radius-sm);
  background: rgba(113, 173, 255, 0.08);
}
.code-box span,
.code-box small {
  color: var(--color-muted);
  font-size: 11px;
}
.code-box strong {
  font: 800 32px var(--font-display);
  letter-spacing: 0.12em;
  color: #fff;
}
@media (max-width: 700px) {
  .page-heading {
    display: block;
  }
  .heading-actions {
    justify-content: flex-start;
    margin-top: 16px;
  }
  .structure-toolbar {
    display: block;
  }
  .live-dot {
    display: block;
    margin-top: 8px;
  }
  .tree-node {
    align-items: flex-start;
  }
  .node-actions {
    justify-content: flex-start;
  }
  .children {
    margin-left: 10px;
    padding-left: 10px;
  }
}
</style>
