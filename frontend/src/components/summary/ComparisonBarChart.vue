<template>
  <article class="comparison-chart page-card chart-card-base">
    <header class="chart-header chart-header-base">
      <div>
        <span class="eyebrow">Comparación por {{ entityLabel }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="chart-unit-base">{{ unit }}</span>
    </header>
    <div v-if="!bars.length" class="chart-empty">
      No hay datos comparables para este periodo.
    </div>
    <div v-else ref="chartWrap" class="chart-wrap">
      <svg
        class="chart"
        viewBox="0 0 1200 390"
        preserveAspectRatio="none"
        role="img"
        :aria-label="`${title} comparativo por ${entityLabel}`"
      >
        <g class="grid-lines">
          <line
            v-for="tick in ticks"
            :key="tick.y"
            x1="100"
            :y1="tick.y"
            x2="1152"
            :y2="tick.y"
          />
        </g>
        <g class="y-axis-labels">
          <text
            v-for="tick in ticks"
            :key="`label-${tick.y}`"
            x="92"
            :y="tick.y + 5"
            text-anchor="end"
          >
            {{ tick.label }}
          </text>
        </g>
        <g
          v-for="bar in bars"
          :key="bar.key"
          class="entity-group"
          :class="{
            'is-dimmed': selectedEntityKey && selectedEntityKey !== bar.entityKey,
            'is-selected': selectedEntityKey === bar.entityKey,
          }"
        >
          <rect
            class="bar"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="bar.color"
            :stroke="bar.color"
            tabindex="0"
            :aria-label="`${bar.label}: ${formatValue(bar.value)} ${unit}`"
            @mouseenter="showTooltip($event, bar)"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, bar)"
            @click="toggleEntitySelection(bar)"
            @keydown.enter.prevent="toggleEntitySelection(bar)"
            @keydown.space.prevent="toggleEntitySelection(bar)"
            @blur="hideTooltip"
          />
          <g
            class="bar-marker"
            :transform="`translate(${bar.x + bar.width / 2}, ${markerY(bar)})`"
            tabindex="0"
            role="button"
            :aria-label="`${bar.label}: seleccionar circuito`"
            @mouseenter="showTooltip($event, bar)"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, bar)"
            @blur="hideTooltip"
            @click="toggleEntitySelection(bar)"
            @keydown.enter.prevent="toggleEntitySelection(bar)"
            @keydown.space.prevent="toggleEntitySelection(bar)"
          >
            <circle v-if="bar.marker === 'circle'" r="6" :fill="bar.color" />
            <rect
              v-else-if="bar.marker === 'square'"
              x="-6"
              y="-6"
              width="12"
              height="12"
              :fill="bar.color"
            />
            <polygon
              v-else-if="bar.marker === 'diamond'"
              points="0,-7 7,0 0,7 -7,0"
              :fill="bar.color"
            />
            <polygon
              v-else
              points="0,-7 7,6 -7,6"
              :fill="bar.color"
            />
          </g>
          <text
            class="x-label"
            :x="bar.x + bar.width / 2"
            y="330"
            text-anchor="middle"
          >
            {{ bar.shortLabel }}
          </text>
        </g>
      </svg>
      <div
        v-if="tooltip"
        class="chart-tooltip"
        :class="{ 'tooltip-below': tooltip.below }"
        :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
        role="status"
      >
        <strong>{{ tooltip.label }}</strong>
        <span
          >{{ title.replace("Comparación de ", "") }}:
          {{ formatValue(tooltip.value) }} {{ unit }}</span
        >
        <small v-if="tooltip.desde || tooltip.hasta"
          >{{ formatDate(tooltip.desde)
          }}<span v-if="tooltip.hasta">
            → {{ formatDate(tooltip.hasta) }}</span
          ></small
        >
      </div>
    </div>
    <footer v-if="bars.length" class="chart-footer">
      <span
        v-for="bar in bars"
        :key="`legend-${bar.key}`"
        class="legend-entry"
        :class="{
          'is-dimmed': selectedEntityKey && selectedEntityKey !== bar.entityKey,
          'is-selected': selectedEntityKey === bar.entityKey,
        }"
      >
        <i
            class="chart-marker-base"
            :class="bar.marker"
          :style="{
            background: bar.color,
            borderColor: bar.color,
          }"
        ></i
        >{{ bar.label }}</span
      >
    </footer>
  </article>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { chartTooltipPosition } from "../../utils/chartTooltip";
import {
  comparisonColor,
  comparisonMarkers,
} from "../../utils/chartVisuals";

const props = defineProps({
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  valueKey: { type: String, required: true },
  entityLabel: { type: String, default: "entidad" },
});

const chartWrap = ref(null);
const tooltip = ref(null);
const selectedEntityKey = ref(null);
function entityKey(row, fallback = "") {
  return String(
    row.circuito_id ??
      row.panel_id ??
      row.circuito ??
      row.panel ??
      row.id ??
      row.nombre ??
      fallback,
  );
}
const validRows = computed(() =>
  props.rows
    .map((row, index) => {
      const nombre =
        row.nombre ||
        (props.entityLabel === "panel"
          ? row.panel_nombre
          : row.circuito_nombre || `Circuito ${row.circuito}`);
      return {
        ...row,
        nombre: nombre || "Sin nombre",
        entityKey: entityKey(row, index),
        value: Number(row[props.valueKey]),
        index,
      };
    })
    .filter((row) => Number.isFinite(row.value)),
);
const maxValue = computed(() =>
  Math.max(0, ...validRows.value.map((row) => row.value)),
);
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((index) => ({
    y: 290 - index * 63.75,
    label: formatValue((maxValue.value * index) / 4),
  })),
);
const bars = computed(() => {
  const step = 1052 / Math.max(1, validRows.value.length);
  const width = Math.min(76, Math.max(18, step * 0.58));
  return validRows.value.map((row, index) => {
    const height = maxValue.value > 0 ? (row.value / maxValue.value) * 255 : 0;
    const label = row.nombre;
    return {
      ...row,
      key: `${label}-${index}`,
      label,
      shortLabel: label.length > 16 ? `${label.slice(0, 14)}…` : label,
      x: 100 + index * step + (step - width) / 2,
      y: 290 - height,
      width,
      height: Math.max(1, height),
       color: comparisonColor(props.color, index % 3),
       marker: comparisonMarkers[index % comparisonMarkers.length],
    };
  });
});
function markerY(bar) {
  return Math.max(18, bar.y - 10);
}
function toggleEntitySelection(bar) {
  selectedEntityKey.value =
    selectedEntityKey.value === bar.entityKey ? null : bar.entityKey;
}
watch(
  () => props.rows.map((row, index) => entityKey(row, index)).join("|"),
  () => {
    selectedEntityKey.value = null;
  },
);
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}
function formatDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}
function showTooltip(event, bar) {
  const container = chartWrap.value?.getBoundingClientRect();
  const marker = event.currentTarget?.getBoundingClientRect();
  const position = chartTooltipPosition(container, marker);
  if (!position) return;
  tooltip.value = {
    ...bar,
    ...position,
  };
}
function hideTooltip() {
  tooltip.value = null;
}
</script>

<style scoped>
.comparison-chart {
  padding: var(--chart-card-padding);
}
.eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.chart-header h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.chart-wrap {
  position: relative;
  width: 100%;
}
.chart {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200/390;
  margin-top: 13px;
  overflow: visible;
}
.grid-lines line {
  stroke: var(--chart-grid);
}
.chart text {
  fill: #fff;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
}
.y-axis-labels text {
  font-size: 15px;
}
.bar {
  cursor: pointer;
  opacity: 0.9;
  stroke-width: 1.5;
  rx: 3;
  filter: drop-shadow(0 0 4px currentColor);
}
.bar-marker {
  cursor: pointer;
  outline: none;
}
.bar-marker circle,
.bar-marker rect,
.bar-marker polygon {
  stroke: var(--chart-active);
  stroke-width: 1.5;
  paint-order: stroke;
  filter: drop-shadow(0 0 4px currentColor);
}
.entity-group.is-selected .bar-marker circle,
.entity-group.is-selected .bar-marker rect,
.entity-group.is-selected .bar-marker polygon,
.bar-marker:focus circle,
.bar-marker:focus rect,
.bar-marker:focus polygon {
  stroke-width: 3;
  filter: drop-shadow(0 0 8px currentColor);
}
.entity-group {
  transition: opacity var(--transition);
}
.entity-group.is-dimmed,
.legend-entry.is-dimmed {
  opacity: 0.28;
}
.entity-group.is-selected,
.legend-entry.is-selected {
  opacity: 1;
}
.entity-group.is-selected .bar {
  stroke-width: 3;
  filter: drop-shadow(0 0 8px currentColor);
}
.bar:hover,
.bar:focus {
  opacity: 1;
  stroke-width: 2.5;
  outline: none;
}
.chart-tooltip {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 4px;
  min-width: 190px;
  max-width: 240px;
  padding: var(--chart-tooltip-padding);
  border: 1px solid var(--chart-tooltip-border);
  border-radius: var(--chart-tooltip-radius);
  background: var(--chart-tooltip-bg);
  color: #fff;
  box-shadow: var(--chart-tooltip-shadow);
  font-size: 13px;
  pointer-events: none;
}
.chart-tooltip.tooltip-below {
  transform: translate(-50%, 0);
}
.chart-tooltip span {
  font-weight: 700;
}
.chart-tooltip small {
  color: #c6d8ed;
  font-size: 13px;
}
.chart-empty {
  min-height: var(--chart-empty-height);
  display: grid;
  place-items: center;
  color: #fff;
}
.chart-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
  color: #fff;
  font-size: 13px;
}
.chart-footer span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-entry {
  transition: opacity var(--transition);
}
</style>
