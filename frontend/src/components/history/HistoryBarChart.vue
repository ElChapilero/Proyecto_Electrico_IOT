<template>
  <article class="history-chart page-card chart-card-base">
    <header class="chart-header chart-header-base">
      <div>
        <span class="eyebrow">Histórico horario</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="chart-unit-base">{{ unit }}</span>
    </header>
    <div v-if="!validPoints.length" class="chart-empty">
      No hay mediciones para los filtros seleccionados.
    </div>
    <div v-else ref="chartWrap" class="chart-layout">
      <svg class="y-axis" viewBox="0 0 82 390" aria-hidden="true">
        <g class="y-axis-labels">
          <text
            v-for="tick in ticks"
            :key="tick.y"
            x="70"
            :y="tick.y + 5"
            text-anchor="end"
          >
            {{ formatValue(tick.value) }}
          </text>
        </g>
      </svg>
      <div class="chart-scroller">
        <div class="chart-canvas" :style="{ width: `${canvasWidth}px` }">
          <svg
            class="chart"
            :viewBox="`0 0 ${canvasWidth} 390`"
            role="img"
            :aria-label="`${title} histórica`"
          >
            <g class="grid-lines">
              <line
                v-for="tick in ticks"
                :key="tick.y"
                x1="0"
                :y1="tick.y"
                :x2="canvasWidth"
                :y2="tick.y"
              />
            </g>
            <polyline
              class="line"
              :points="linePoints"
              :stroke="color"
            />
            <circle
              v-for="(point, index) in plottedPoints"
              :key="`${point.fecha_hora}-${point.circuito_id}-${index}`"
              class="point"
              :cx="point.x + point.width / 2"
              :cy="point.y"
              r="4"
              :fill="color"
              :class="{
                'is-dimmed': selectedCircuitKey && selectedCircuitKey !== circuitKey(point),
                'is-point-selected': selectedPointKey === point.selectionKey,
              }"
              tabindex="0"
              :aria-label="`${formatDate(point.fecha_hora)}: ${formatValue(point.value)} ${unit}`"
              @mouseenter="showTooltip($event, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, point)"
              @blur="hideTooltip"
              @click="togglePointSelection(point)"
              @keydown.enter.prevent="togglePointSelection(point)"
              @keydown.space.prevent="togglePointSelection(point)"
            />
            <g class="time-axis">
              <line
                v-for="tick in timeTicks"
                :key="tick.index"
                :x1="tick.x"
                y1="290"
                :x2="tick.x"
                y2="305"
              />
              <text
                v-for="tick in timeTicks"
                :key="`t-${tick.index}`"
                :x="tick.x"
                y="330"
                text-anchor="middle"
              >
                {{ tick.label }}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
    <div v-if="validPoints.length > 30" class="chart-footer">
      Desplaza horizontalmente para visualizar las demás horas.
    </div>
    <div
      v-if="tooltip"
      class="chart-tooltip"
      :class="{ 'tooltip-below': tooltip.below }"
      :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
      role="status"
    >
      <strong>{{ title }}</strong
      ><span>Fecha: {{ tooltip.date }}</span
      ><span>Hora: {{ tooltip.time }}</span
      ><span>Valor: {{ formatValue(tooltip.value) }} {{ unit }}</span>
    </div>
  </article>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { chartTooltipPosition } from "../../utils/chartTooltip";
const props = defineProps({
  points: { type: Array, default: () => [] },
  variable: { type: String, required: true },
});
const metadata = {
  voltaje: ["Voltaje", "V", "promedio_voltaje", "#FF3131"],
  corriente: ["Corriente", "A", "promedio_corriente", "#7B2CFF"],
  potencia: ["Potencia", "W", "promedio_potencia", "#DFFF00"],
  energia: ["Energía", "kWh", "consumo_energia", "#39FF14"],
  factor_potencia: [
    "Factor de potencia",
    "FP",
    "promedio_factor_potencia",
    "#FF6A00",
  ],
};
const current = computed(() => metadata[props.variable] || metadata.voltaje);
const title = computed(() => `${current.value[0]} histórica`);
const unit = computed(() => current.value[1]);
const dataKey = computed(() => current.value[2]);
const color = computed(() => current.value[3]);
const validPoints = computed(() =>
  props.points.filter(
    (point) =>
      Number.isFinite(Number(point[dataKey.value])) &&
      Number.isFinite(new Date(point.fecha_hora).getTime()),
  ),
);
const canvasWidth = computed(
  () => 980 * Math.max(1, Math.ceil(validPoints.value.length / 30)),
);
const chartWrap = ref(null);
const tooltip = ref(null);
const selectedCircuitKey = ref(null);
const selectedPointKey = ref(null);
function circuitKey(point) {
  return String(
    point.circuito_id ??
      point.circuit_id ??
      point.circuito ??
      point.circuito_nombre ??
      "default",
  );
}
const bounds = computed(() => {
  const values = validPoints.value.map((point) => Number(point[dataKey.value]));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(max - min, Math.abs(max) * 0.1, 0.001);
  return { min: min - span * 0.05, max: max + span * 0.05 };
});
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((index) => ({
    y: 35 + index * 63.75,
    value:
      bounds.value.max - (index * (bounds.value.max - bounds.value.min)) / 4,
  })),
);
const plottedPoints = computed(() => {
  const step = (canvasWidth.value - 24) / Math.max(1, validPoints.value.length);
  const width = Math.min(76, Math.max(18, step * 0.62));
  return validPoints.value.map((point, index) => {
    const value = Number(point[dataKey.value]);
    const y =
      35 +
      ((bounds.value.max - value) / (bounds.value.max - bounds.value.min)) *
        255;
    return {
      ...point,
      value,
      selectionKey: `${circuitKey(point)}-${point.fecha_hora}-${index}`,
      x: index * step + (step - width) / 2,
      width,
      y,
      height: Math.max(1, 290 - y),
    };
  });
});
const linePoints = computed(() =>
  plottedPoints.value
    .map((point) => `${(point.x + point.width / 2).toFixed(1)},${point.y.toFixed(1)}`)
    .join(" "),
);
const timeTicks = computed(() => {
  const data = plottedPoints.value;
  const step = data.length <= 8 ? 1 : Math.ceil(data.length / 8);
  return data
    .filter((_, index) => index % step === 0 || index === data.length - 1)
    .map((point, index) => ({
      index,
      x: point.x + point.width / 2,
      label: formatDate(point.fecha_hora),
    }));
});
function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(new Date(value));
}
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 3 });
}
function showTooltip(event, point) {
  const container = chartWrap.value?.getBoundingClientRect();
  const marker = event.currentTarget?.getBoundingClientRect();
  const position = chartTooltipPosition(container, marker);
  if (!position) return;
  tooltip.value = {
    value: point.value,
    date: new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeZone: "America/Bogota",
    }).format(new Date(point.fecha_hora)),
    time: new Intl.DateTimeFormat("es-CO", {
      timeStyle: "short",
      hour12: false,
      timeZone: "America/Bogota",
    }).format(new Date(point.fecha_hora)),
    ...position,
  };
}
function hideTooltip() {
  tooltip.value = null;
}
function togglePointSelection(point) {
  const key = circuitKey(point);
  if (selectedPointKey.value === point.selectionKey) {
    selectedCircuitKey.value = null;
    selectedPointKey.value = null;
    return;
  }
  selectedCircuitKey.value = key;
  selectedPointKey.value = point.selectionKey;
}
watch(
  () => props.points.map((point) => `${circuitKey(point)}-${point.fecha_hora}`).join("|"),
  () => {
    selectedCircuitKey.value = null;
    selectedPointKey.value = null;
  },
);
</script>
<style scoped>
.history-chart {
  padding: var(--chart-card-padding);
}
.eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.chart-header h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.chart-layout {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  margin-top: 13px;
  min-width: 0;
}
.y-axis {
  width: 82px;
  height: 390px;
}
.chart-scroller {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
}
.chart-canvas {
  min-width: 980px;
  height: 390px;
}
.chart {
  display: block;
  width: 100%;
  height: 390px;
}
.grid-lines line {
  stroke: var(--chart-grid);
}
.chart text,
.y-axis text {
  fill: #fff;
  font-family: var(--font-body);
  font-weight: 600;
}
.y-axis-labels text {
  font-size: 14px;
}
.time-axis text {
  font-size: 13px;
}
.time-axis line {
  stroke: var(--chart-axis);
}
.line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 4px currentColor);
}
.point {
  cursor: pointer;
  opacity: 0.9;
  stroke: var(--chart-active);
  stroke-width: 1.5;
  filter: drop-shadow(0 0 4px currentColor);
}
.point.is-dimmed {
  opacity: 0.28;
}
.point.is-point-selected {
  opacity: 1;
  r: 7;
  stroke-width: 3;
  filter: drop-shadow(0 0 8px currentColor);
}
.point:hover,
.point:focus {
  opacity: 1;
  r: 7;
  stroke-width: 2.5;
  outline: none;
}
.chart-empty {
  min-height: var(--chart-empty-height);
  display: grid;
  place-items: center;
  color: #fff;
}
.chart-footer {
  margin-top: 8px;
  color: #fff;
  font-size: 13px;
}
.chart-tooltip {
  position: fixed;
  z-index: var(--chart-tooltip-z);
  transform: translate(-50%, -100%);
  display: grid;
  gap: 4px;
  min-width: 190px;
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
  font-weight: 600;
}
</style>
