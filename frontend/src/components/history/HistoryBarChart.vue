<template>
  <article class="history-chart page-card">
    <header class="chart-header">
      <div>
        <span class="eyebrow">Histórico horario</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="unit">{{ unit }}</span>
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
            <rect
              v-for="(point, index) in plottedPoints"
              :key="`${point.fecha_hora}-${point.circuito_id}-${index}`"
              class="bar"
              :x="point.x"
              :y="point.y"
              :width="point.width"
              :height="point.height"
              :fill="color"
              tabindex="0"
              :aria-label="`${formatDate(point.fecha_hora)}: ${formatValue(point.value)} ${unit}`"
              @mouseenter="showTooltip($event, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, point)"
              @blur="hideTooltip"
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
import { computed, ref } from "vue";
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
      x: index * step + (step - width) / 2,
      width,
      y,
      height: Math.max(1, 290 - y),
    };
  });
});
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
</script>
<style scoped>
.history-chart {
  padding: 19px 20px;
  overflow: hidden;
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
  font-weight: 700;
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
.chart-layout {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  margin-top: 13px;
  min-width: 0;
}
.y-axis {
  width: 82px;
  height: 390px;
  background: #1e2d40;
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
  stroke: rgba(180, 205, 232, 0.22);
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
  font-size: 12px;
}
.time-axis line {
  stroke: rgba(210, 230, 250, 0.65);
}
.bar {
  cursor: pointer;
  opacity: 0.88;
  rx: 3;
}
.bar:hover,
.bar:focus {
  opacity: 1;
  stroke: #fff;
  stroke-width: 2;
  outline: none;
}
.chart-empty {
  min-height: 280px;
  display: grid;
  place-items: center;
  color: #fff;
}
.chart-footer {
  margin-top: 8px;
  color: #fff;
  font-size: 12px;
}
.chart-tooltip {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 4px;
  min-width: 205px;
  padding: 10px 12px;
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
  font-weight: 600;
}
</style>
