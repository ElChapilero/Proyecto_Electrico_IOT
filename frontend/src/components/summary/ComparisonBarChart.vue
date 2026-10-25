<template>
  <article class="comparison-chart page-card">
    <header class="chart-header">
      <div>
        <span class="eyebrow">Comparación por {{ entityLabel }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="unit">{{ unit }}</span>
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
        <defs>
          <pattern
            id="comparison-dots"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.6" :fill="color" />
          </pattern>
        </defs>
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
        <g v-for="bar in bars" :key="bar.key">
          <rect
            class="bar"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="bar.fill"
            :stroke="color"
            :stroke-dasharray="bar.dash"
            tabindex="0"
            :aria-label="`${bar.label}: ${formatValue(bar.value)} ${unit}`"
            @mouseenter="showTooltip($event, bar)"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, bar)"
            @blur="hideTooltip"
          />
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
        ><i class="legend-sample filled" :style="{ background: color }"></i
        >Valores comparados</span
      ><span
        ><i class="legend-sample outline" :style="{ borderColor: color }"></i
        >Patrones por entidad</span
      >
    </footer>
  </article>
</template>

<script setup>
import { computed, ref } from "vue";
import { chartTooltipPosition } from "../../utils/chartTooltip";

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
const validRows = computed(() =>
  props.rows
    .map((row, index) => ({
      ...row,
      value: Number(row[props.valueKey]),
      index,
    }))
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
    const label =
      props.entityLabel === "panel"
        ? row.panel_nombre
        : row.circuito_nombre || `Circuito ${row.circuito}`;
    return {
      ...row,
      key: `${label}-${index}`,
      label,
      shortLabel: label.length > 16 ? `${label.slice(0, 14)}…` : label,
      x: 100 + index * step + (step - width) / 2,
      y: 290 - height,
      width,
      height: Math.max(1, height),
      fill:
        index % 3 === 0
          ? props.color
          : index % 3 === 1
            ? "transparent"
            : "url(#comparison-dots)",
      dash: index % 3 === 1 ? "8 6" : undefined,
    };
  });
});
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
  width: 100%;
  min-width: 0;
  padding: 19px 20px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.chart-header h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.unit {
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--color-primary-soft);
  color: #dceaff;
  font-size: 12px;
  font-weight: 700;
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
  stroke: rgba(180, 205, 232, 0.22);
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
  stroke-width: 3;
  rx: 4;
}
.bar:hover,
.bar:focus {
  opacity: 1;
  stroke-width: 4;
  outline: none;
}
.chart-tooltip {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 4px;
  min-width: 190px;
  padding: 9px 11px;
  border: 1px solid rgba(150, 190, 235, 0.35);
  border-radius: 8px;
  background: #0b1728;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 12px;
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
  font-size: 11px;
}
.chart-empty {
  min-height: 280px;
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
  font-size: 12px;
}
.chart-footer span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-sample {
  display: inline-block;
  width: 18px;
  height: 10px;
  border: 2px solid;
}
.legend-sample.filled {
  border-color: transparent;
}
.legend-sample.outline {
  border-style: dashed;
}
</style>
