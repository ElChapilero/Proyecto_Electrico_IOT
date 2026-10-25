<template>
  <div class="charts-stack">
    <article
      v-for="chart in chartDefinitions"
      :key="chart.key"
      class="history-chart page-card"
    >
      <header class="chart-header">
        <div>
          <span class="eyebrow">Histórico horario</span>
          <h3>{{ chart.title }}</h3>
        </div>
        <span class="unit">{{ chart.unit }}</span>
      </header>
      <div v-if="!points.length" class="chart-empty">
        No hay mediciones para los filtros seleccionados.
      </div>
      <div v-else class="chart-scroller">
        <div class="chart-canvas" :style="{ width: `${canvasWidth}px` }">
          <svg
            class="chart"
            :viewBox="`0 0 ${canvasWidth} 390`"
            role="img"
            :aria-label="`${chart.title} histórica`"
          >
            <g class="grid-lines">
              <line
                v-for="tick in ticks(chart.key)"
                :key="tick.y"
                x1="82"
                :y1="tick.y"
                :x2="canvasWidth - 24"
                :y2="tick.y"
              />
            </g>
            <g class="y-axis-labels">
              <text
                v-for="tick in ticks(chart.key)"
                :key="`label-${tick.y}`"
                x="74"
                :y="tick.y + 5"
                text-anchor="end"
              >
                {{ formatValue(tick.value) }}
              </text>
            </g>
            <polyline
              v-if="chart.type === 'line'"
              class="line"
              :stroke="chart.color"
              :points="linePoints(chart.key)"
            />
            <g
              v-for="(point, index) in plotted(chart.key)"
              :key="`${point.fecha_hora}-${point.circuito_id}-${index}`"
            >
              <rect
                v-if="chart.type === 'bar'"
                class="bar"
                :x="point.x"
                :y="point.y"
                :width="point.width"
                :height="point.height"
                :fill="chart.color"
                tabindex="0"
                @mouseenter="showTooltip($event, point, chart)"
                @mouseleave="hideTooltip"
                @focus="showTooltip($event, point, chart)"
                @blur="hideTooltip"
              />
              <circle
                v-else
                class="point"
                :cx="point.x + point.width / 2"
                :cy="point.y"
                r="4"
                :fill="chart.color"
                tabindex="0"
                @mouseenter="showTooltip($event, point, chart)"
                @mouseleave="hideTooltip"
                @focus="showTooltip($event, point, chart)"
                @blur="hideTooltip"
              />
            </g>
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
      <div v-if="points.length" class="chart-footer">
        Desplaza horizontalmente para visualizar todas las horas.
      </div>
    </article>
    <div
      v-if="tooltip"
      class="chart-tooltip"
      :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
      role="status"
    >
      <strong>{{ tooltip.chart.title }}</strong
      ><span>Fecha: {{ tooltip.date }}</span
      ><span>Hora: {{ tooltip.time }}</span
      ><span
        >Valor: {{ formatValue(tooltip.value) }} {{ tooltip.chart.unit }}</span
      >
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  points: { type: Array, default: () => [] },
  variable: { type: String, required: true },
});
const colors = {
  voltaje: "#FF3131",
  corriente: "#7B2CFF",
  potencia: "#DFFF00",
  energia: "#39FF14",
  factor_potencia: "#FF6A00",
};
const metadata = {
  voltaje: ["Voltaje", "V"],
  corriente: ["Corriente", "A"],
  potencia: ["Potencia", "W"],
  energia: ["Energía", "kWh"],
  factor_potencia: ["Factor de potencia", "FP"],
};
const chartDefinitions = computed(() => {
  const [title, unit] = metadata[props.variable] || metadata.voltaje;
  return [
    {
      key: props.variable,
      title: `${title} histórica`,
      unit,
      color: colors[props.variable] || colors.voltaje,
      type: "bar",
    },
    {
      key: props.variable,
      title: `${title} por hora`,
      unit,
      color: colors[props.variable] || colors.voltaje,
      type: "line",
    },
  ];
});
const dataKey = computed(
  () =>
    ({
      voltaje: "promedio_voltaje",
      corriente: "promedio_corriente",
      potencia: "promedio_potencia",
      energia: "consumo_energia",
      factor_potencia: "promedio_factor_potencia",
    })[props.variable] || "promedio_voltaje",
);
const validPoints = computed(() =>
  props.points.filter(
    (point) =>
      Number.isFinite(Number(point[dataKey.value])) &&
      Number.isFinite(new Date(point.fecha_hora).getTime()),
  ),
);
const canvasWidth = computed(() =>
  Math.max(980, 105 * validPoints.value.length + 110),
);
const tooltip = ref(null);
function values() {
  return validPoints.value.map((point) => Number(point[dataKey.value]));
}
function bounds() {
  const numbers = values();
  const min = Math.min(...numbers, 0);
  const max = Math.max(...numbers, 1);
  const span = Math.max(max - min, Math.abs(max) * 0.1, 0.001);
  return { min: min - span * 0.05, max: max + span * 0.05 };
}
function ticks() {
  const bound = bounds();
  return [0, 1, 2, 3, 4].map((i) => ({
    y: 35 + i * 63.75,
    value: bound.max - (i * (bound.max - bound.min)) / 4,
  }));
}
function plotted() {
  const bound = bounds();
  const step =
    (canvasWidth.value - 106) / Math.max(1, validPoints.value.length);
  const width = Math.min(76, Math.max(18, step * 0.62));
  return validPoints.value.map((point, index) => {
    const value = Number(point[dataKey.value]);
    const y = 35 + ((bound.max - value) / (bound.max - bound.min)) * 255;
    return {
      ...point,
      value,
      x: 82 + index * step + (step - width) / 2,
      width,
      y,
      height: Math.max(1, 290 - y),
    };
  });
}
function linePoints() {
  return plotted()
    .map((point) => `${point.x + point.width / 2},${point.y}`)
    .join(" ");
}
const timeTicks = computed(() => {
  const data = plotted();
  if (data.length <= 8)
    return data.map((p, index) => ({
      index,
      x: p.x + p.width / 2,
      label: formatDate(p.fecha_hora),
    }));
  const step = Math.ceil(data.length / 8);
  return data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((p, index) => ({
      index,
      x: p.x + p.width / 2,
      label: formatDate(p.fecha_hora),
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
function showTooltip(event, point, chart) {
  tooltip.value = {
    chart,
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
    left: Math.min((event.clientX || 0) + 12, window.innerWidth - 230),
    top: Math.min((event.clientY || 0) + 12, window.innerHeight - 135),
  };
}
function hideTooltip() {
  tooltip.value = null;
}
</script>

<style scoped>
.charts-stack {
  display: grid;
  gap: 18px;
}
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
.unit {
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--color-primary-soft);
  color: #dceaff;
  font-size: 13px;
  font-weight: 700;
}
.chart-scroller {
  overflow-x: auto;
  overflow-y: hidden;
  margin-top: 13px;
  padding-bottom: 8px;
}
.chart-canvas {
  min-width: 980px;
}
.chart {
  display: block;
  width: 100%;
  height: 390px;
  overflow: visible;
}
.grid-lines line {
  stroke: rgba(180, 205, 232, 0.22);
}
.chart text {
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
.line {
  fill: none;
  stroke-width: 3;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.point {
  cursor: pointer;
  stroke: #0b1728;
  stroke-width: 2;
}
.point:focus {
  stroke: #fff;
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
  font-size: 13px;
}
.chart-tooltip {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 4px;
  min-width: 205px;
  padding: 10px 12px;
  border: 1px solid rgba(150, 190, 235, 0.35);
  border-radius: 8px;
  background: #0b1728;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  pointer-events: none;
}
.chart-tooltip span {
  font-weight: 600;
}
</style>
