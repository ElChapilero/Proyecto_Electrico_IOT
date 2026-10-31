<template>
  <article class="distribution page-card chart-card-base">
    <header>
      <div>
        <span class="eyebrow">Distribución por {{ entityLabel }}</span>
        <h3>Participación del consumo</h3>
      </div>
    </header>
    <div v-if="!items.length" class="empty">
      No hay consumo comparable para este periodo.
    </div>
    <div v-else class="distribution-body">
      <div
        class="donut"
        :style="{ background: gradient }"
        role="img"
        :aria-label="`Distribución porcentual del consumo por ${entityLabel}`"
      >
        <div>
          <strong>{{ formatValue(total) }}</strong
          ><small>kWh total</small>
        </div>
      </div>
      <ul class="legend">
        <li
          v-for="item in items"
          :key="item.key"
          tabindex="0"
          role="button"
          :aria-pressed="selectedItemKey === item.key"
          :class="{ 'is-dimmed': selectedItemKey && selectedItemKey !== item.key }"
          @click="toggleItemSelection(item)"
          @keydown.enter.prevent="toggleItemSelection(item)"
          @keydown.space.prevent="toggleItemSelection(item)"
        >
          <i :style="{ background: item.color }"></i
          ><span>{{ item.label }}</span
          ><strong>{{ formatPercent(item.porcentaje) }}%</strong>
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  entityLabel: { type: String, default: "entidad" },
});
const selectedItemKey = ref(null);
const colors = [
  "#39FF14",
  "#DFFF00",
  "#FF3131",
  "#7B2CFF",
  "#FF6A00",
  "#22D3EE",
  "#F472B6",
  "#A78BFA",
];
const items = computed(() =>
  props.rows
    .map((row, index) => ({
      ...row,
      key: `${index}-${row.panel_id || row.circuito_id}`,
      label:
        props.entityLabel === "panel"
          ? row.panel_nombre
          : row.circuito_nombre || `Circuito ${row.circuito}`,
      porcentaje: Number(row.porcentaje_consumo) || 0,
      color: colors[index % colors.length],
    }))
    .filter((row) => row.porcentaje > 0),
);
const total = computed(() => Number(props.rows[0]?.consumo_total) || 0);
const gradient = computed(() => {
  let start = 0;
  return `conic-gradient(${items.value
    .map((item) => {
      const end = start + item.porcentaje;
      const visibleColor =
        selectedItemKey.value && selectedItemKey.value !== item.key
          ? `color-mix(in srgb, ${item.color} 28%, transparent)`
          : item.color;
      const part = `${visibleColor} ${start}% ${end}%`;
      start = end;
      return part;
    })
    .join(", ")})`;
});
function toggleItemSelection(item) {
  selectedItemKey.value =
    selectedItemKey.value === item.key ? null : item.key;
}
watch(
  () =>
    props.rows
      .map((row, index) => `${index}-${row.panel_id || row.circuito_id}`)
      .join("|"),
  () => {
    selectedItemKey.value = null;
  },
);
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatPercent(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 1 });
}
</script>

<style scoped>
.distribution {
  padding: var(--chart-card-padding);
}
.distribution header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--chart-header-height);
}
.eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.distribution h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.distribution-body {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  align-items: center;
  gap: 24px;
  min-height: var(--chart-empty-height);
}
.donut {
  position: relative;
  width: 210px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.donut::before {
  content: "";
  position: absolute;
  width: 142px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #18283c;
}
.donut > div {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  place-items: center;
  color: #fff;
}
.donut strong {
  font-size: 22px;
}
.donut small {
  font-size: 13px;
}
.legend {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.legend li {
  display: grid;
  grid-template-columns: 13px max-content max-content;
  justify-content: start;
  align-items: center;
  column-gap: 10px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity var(--transition);
}
.legend li.is-dimmed {
  opacity: 0.35;
}
.legend li:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.legend i {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}
.legend strong {
  font-size: 13px;
}
.empty {
  min-height: var(--chart-empty-height);
  display: grid;
  place-items: center;
  color: #fff;
}
@media (max-width: 650px) {
  .distribution-body {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .legend {
    width: 100%;
  }
}
</style>
