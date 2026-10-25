<template>
  <div>
    <div
      class="tree-node"
      :class="[
        panel.tipo_panel === 'Principal' ? 'principal-node' : 'secondary-node',
        { selected: selected?.id === panel.id },
      ]"
      @click="emit('select', { kind: 'panel', id: panel.id })"
    >
      <span class="node-icon">▣</span
      ><span class="node-copy"
        ><strong>{{ panel.nombre }}</strong
        ><small>{{
          panel.tipo_panel === "Principal"
            ? "Panel principal"
            : "Panel secundario"
        }}</small></span
      >
      <div class="node-actions">
        <button
          class="action-button"
          v-if="isAdmin"
          @click.stop="emit('rename-panel', panel)"
        >
          Renombrar</button
        ><button
          class="action-button"
          v-if="panel.tipo_panel === 'Principal' && isAdmin"
          @click.stop="emit('add-secondary', panel.id)"
        >
          ＋ Secundario</button
        ><button
          class="action-button delete-button"
          v-if="isAdmin"
          @click.stop="emit('delete-panel', panel)"
        >
          Eliminar
        </button>
      </div>
    </div>
    <ul v-if="panel.tipo_panel === 'Principal'" class="tree children">
      <li
        v-for="child in allPanels.filter(
          (p) => p.id_panel_principal === panel.id,
        )"
        :key="child.id"
      >
        <PanelNode
          :panel="child"
          :all-panels="allPanels"
          :devices-by-panel="devicesByPanel"
          :circuits-by-device="circuitsByDevice"
          :selected="selected"
          :is-admin="isAdmin"
          @select="emit('select', $event)"
          @rename-panel="emit('rename-panel', $event)"
          @add-secondary="emit('add-secondary', $event)"
          @delete-panel="emit('delete-panel', $event)"
          @rename-device="emit('rename-device', $event)"
          @move-device="emit('move-device', $event)"
          @delete-device="emit('delete-device', $event)"
          @rename-circuit="emit('rename-circuit', $event)"
          @delete-circuit="emit('delete-circuit', $event)"
        />
      </li>
    </ul>
    <ul class="tree device-list">
      <li v-for="device in devicesByPanel[panel.id] || []" :key="device.id">
        <div
          class="tree-node device-node"
          :class="{ selected: selected?.id === device.id }"
          @click.stop="emit('select', { kind: 'device', id: device.id })"
        >
          <span class="node-icon">⌁</span
          ><span class="node-copy"
            ><strong>{{ device.nombre }}</strong
            ><small
              >ESP32 ·
              {{ (circuitsByDevice[device.id] || []).length }} circuitos</small
            ></span
          >
          <div class="node-actions">
            <button
              class="action-button"
              v-if="isAdmin"
              @click.stop="emit('rename-device', device)"
            >
              Renombrar</button
            ><button
              class="action-button"
              v-if="isAdmin"
              @click.stop="emit('move-device', device)"
            >
              Mover</button
            ><button
              class="action-button delete-button"
              v-if="isAdmin"
              @click.stop="emit('delete-device', device)"
            >
              Eliminar
            </button>
          </div>
        </div>
        <ul v-if="circuitsByDevice[device.id]?.length" class="circuit-list">
          <li
            v-for="circuit in circuitsByDevice[device.id]"
            :key="circuit.id"
            class="circuit-row"
          >
            <span>◦ Circuito {{ circuit.indice }} — {{ circuit.nombre }}</span
            ><button
              class="action-button"
              v-if="isAdmin"
              @click.stop="emit('rename-circuit', circuit)"
            >
              Renombrar</button
            ><button
              class="action-button delete-button"
              v-if="isAdmin"
              @click.stop="emit('delete-circuit', circuit)"
            >
              Eliminar
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
<script setup>
defineOptions({ inheritAttrs: false });
defineProps({
  panel: Object,
  allPanels: Array,
  devicesByPanel: Object,
  circuitsByDevice: Object,
  selected: Object,
  isAdmin: Boolean,
});
const emit = defineEmits([
  "select",
  "rename-panel",
  "add-secondary",
  "delete-panel",
  "rename-device",
  "move-device",
  "delete-device",
  "rename-circuit",
  "delete-circuit",
]);
</script>
<style scoped>
.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.children {
  margin-left: 25px;
  padding-left: 18px;
}
.device-list {
  margin-left: 42px;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 54px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  margin: 12px 0;
  cursor: pointer;
}
.principal-node {
  background: rgba(23, 36, 55, 0.72);
}
.secondary-node {
  background: rgba(30, 45, 64, 0.72);
}
.device-node {
  background: rgba(25, 40, 59, 0.72);
}
.tree-node:hover,
.tree-node.selected {
  background: rgba(113, 173, 255, 0.16);
}
.node-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
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
  font-size: 13px;
}
.node-copy small {
  color: #fff;
  font-size: 13px;
}
.node-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.action-button {
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #081321;
  font-size: 13px;
  font-weight: 600;
}
.action-button:hover {
  background: #8fc0ff;
  border-color: #8fc0ff;
}
.action-button.delete-button {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: #081321;
}
.action-button.delete-button:hover {
  background: #ff5c6d;
  border-color: #ff5c6d;
}
.circuit-list {
  display: grid;
  gap: 10px;
  padding: 0 12px 12px 48px;
  list-style: none;
}
.circuit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  margin: 3px 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(23, 36, 55, 0.5);
}
.circuit-row:nth-child(even) {
  background: rgba(30, 45, 64, 0.5);
}
.circuit-row span {
  flex: 1;
}
@media (max-width: 700px) {
  .children {
    margin-left: 10px;
    padding-left: 10px;
  }
  .device-list {
    margin-left: 12px;
  }
  .tree-node {
    align-items: flex-start;
  }
  .node-actions {
    justify-content: flex-start;
  }
}
</style>
