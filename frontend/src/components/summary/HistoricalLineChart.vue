<template>
  <article class="history-chart page-card">
    <header class="chart-header">
      <div>
        <span class="eyebrow">{{ periodLabel }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="unit">{{ unit }}</span>
    </header>
    <div v-if="!points.length" class="chart-empty">
      No hay mediciones para este periodo.
    </div>
    <div v-else ref="chartWrap" class="chart-wrap">
      <svg
        class="chart"
        viewBox="0 0 1200 390"
        preserveAspectRatio="none"
        role="img"
        :aria-label="`${title} por ${periodLabel}`"
      >
        <g class="grid-lines">
          <line
            v-for="tick in yTicks"
            :key="tick.y"
            x1="100"
            :y1="tick.y"
            x2="1152"
            :y2="tick.y"
          />
        </g>
        <g class="y-axis-labels">
          <text
            v-for="tick in yTicks"
            :key="`label-${tick.y}`"
            x="92"
            :y="tick.y + 5"
            text-anchor="end"
          >
            {{ tick.label }}
          </text>
        </g>
        <line
          v-if="averageY !== null"
          class="average-line"
          x1="100"
          :y1="averageY"
          x2="1152"
          :y2="averageY"
        />
        <rect
          v-for="point in plottedPoints"
          :key="point.key"
          class="bar"
          :x="point.x"
          :y="point.y"
          :width="point.width"
          :height="point.height"
          :fill="color"
          tabindex="0"
          :aria-label="`${title}: ${formatValue(point.value)} ${unit}, ${formatTooltipDate(point.time)}`"
          @mouseenter="showTooltip($event, point)"
          @mouseleave="hideTooltip"
          @focus="showTooltip($event, point)"
          @blur="hideTooltip"
          @touchstart.prevent="showTooltip($event, point)"
        />
        <g class="time-axis">
          <line
            v-for="tick in timeTicks"
            :key="`mark-${tick.key}`"
            :x1="tick.x"
            y1="290"
            :x2="tick.x"
            y2="305"
          />
          <text
            v-for="tick in timeTicks"
            :key="tick.key"
            :x="tick.x"
            y="330"
            text-anchor="middle"
          >
            {{ tick.label }}
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
        <strong>{{ title }}</strong>
        <span>{{ formatValue(tooltip.value) }} {{ unit }}</span>
        <small
          >{{ tooltipDateLabel }}: {{ formatTooltipDate(tooltip.time) }}</small
        >
      </div>
    </div>
    <div v-if="points.length" class="chart-footer">
      <span
        ><i class="legend-line" :style="{ borderTopColor: color }"></i>Valor
        promedio por {{ periodLabel.toLowerCase() }}</span
      >
      <span
        ><i class="legend-line average" :style="{ borderTopColor: color }"></i
        >Promedio del periodo</span
      >
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  points: { type: Array, default: () => [] },
  average: { type: Number, default: null },
  period: { type: String, required: true },
});

const chartWrap = ref(null);
const tooltip = ref(null);
const periodLabel = computed(
  () =>
    ({ day: "24 horas", week: "Días de la semana", month: "Días del mes" })[
      props.period
    ] || "Periodo",
);
const tooltipDateLabel = computed(() =>
  props.period === "day" ? "Fecha y hora" : "Fecha",
);
const validPoints = computed(() =>
  props.points.filter(
    (point) =>
      Number.isFinite(Number(point.value)) &&
      Number.isFinite(new Date(point.time).getTime()),
  ),
);
const minValue = computed(() =>
  Math.min(...validPoints.value.map((point) => Number(point.value))),
);
const maxValue = computed(() =>
  Math.max(...validPoints.value.map((point) => Number(point.value))),
);
const minTime = computed(() =>
  Math.min(...validPoints.value.map((point) => new Date(point.time).getTime())),
);
const maxTime = computed(() =>
  Math.max(...validPoints.value.map((point) => new Date(point.time).getTime())),
);
const valueSpan = computed(() =>
  Math.max(0.000001, maxValue.value - minValue.value),
);
const timeSpan = computed(() => Math.max(1, maxTime.value - minTime.value));
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 3 });
}
function formatTooltipDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(
    "es-CO",
    props.period === "day"
      ? {
          weekday: "long",
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : { weekday: "long", day: "2-digit", month: "long", year: "numeric" },
  ).format(date);
}
const plottedPoints = computed(() => {
  const step = 1052 / Math.max(1, validPoints.value.length);
  const width = Math.min(42, Math.max(6, step * 0.68));
  return validPoints.value.map((point, index) => {
    const value = Number(point.value);
    const y = 35 + ((maxValue.value - value) / valueSpan.value) * 255;
    return {
      ...point,
      key: `${point.time}-${index}`,
      value,
      x: 100 + index * step + (step - width) / 2,
      y,
      width,
      height: Math.max(1, 290 - y),
    };
  });
});
const averageY = computed(() =>
  props.average === null || !Number.isFinite(Number(props.average))
    ? null
    : 35 + ((maxValue.value - Number(props.average)) / valueSpan.value) * 255,
);
const yTicks = computed(() =>
  [0, 1, 2, 3, 4].map((index) => {
    const ratio = index / 4;
    return {
      y: 35 + ratio * 255,
      label: formatValue(maxValue.value - ratio * valueSpan.value),
    };
  }),
);
const timeTicks = computed(() => {
  const points = plottedPoints.value;
  if (points.length <= 6)
    return points.map((point) => ({
      key: point.key,
      x: point.x,
      label: formatAxisDate(point.time),
    }));
  const step = Math.ceil(points.length / 6);
  return points
    .filter((_, index) => index % step === 0 || index === points.length - 1)
    .map((point) => ({
      key: point.key,
      x: point.x,
      label: formatAxisDate(point.time),
    }));
});
function formatAxisDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(
    "es-CO",
    props.period === "day"
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : { day: "2-digit", month: "short" },
  ).format(date);
}
function showTooltip(event, point) {
  const container = chartWrap.value?.getBoundingClientRect();
  const marker = event.currentTarget?.getBoundingClientRect();
  if (!container || !marker) return;
  const half = Math.min(140, Math.max(80, container.width / 2 - 8));
  const center = marker.left + marker.width / 2;
  const left = Math.min(
    Math.max(center, container.left + half),
    container.right - half,
  );
  const below = marker.top - container.top < 110;
  tooltip.value = {
    ...point,
    left,
    top: below ? marker.bottom + 10 : marker.top - 10,
    below,
  };
}
function hideTooltip() {
  tooltip.value = null;
}
</script>

<style scoped>
.history-chart {
  width: 100%;
  min-width: 0;
  padding: 19px 20px;
}
.chart-header {
  display: flex;
  align-items: flex-start;
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
.chart-wrap {
  position: relative;
  width: 100%;
  overflow: visible;
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
  stroke-width: 1;
}
.chart .bar {
  cursor: pointer;
  opacity: 0.9;
  stroke: #fff;
  stroke-width: 1.5;
  rx: 3;
  filter: drop-shadow(0 0 4px currentColor);
}
.chart .bar:hover,
.chart .bar:focus {
  opacity: 1;
  stroke-width: 2.5;
  outline: none;
}
.chart text {
  fill: #fff;
  font-family: var(--font-body);
  font-weight: 600;
}
.y-axis-labels text {
  font-size: 15px;
}
.time-axis line {
  stroke: rgba(210, 230, 250, 0.65);
  stroke-width: 1;
}
.time-axis text {
  font-size: 13px;
}
.average-line {
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 8 8;
  opacity: 0.72;
}
.chart-tooltip {
  position: fixed;
  z-index: 2;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 3px;
  min-width: 170px;
  max-width: 250px;
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
.chart-tooltip strong {
  color: #eaf3ff;
}
.chart-tooltip span {
  color: #fff;
  font-weight: 700;
}
.chart-tooltip small {
  color: #fff;
}
.chart-empty {
  height: auto;
  aspect-ratio: 1200/390;
  margin-top: 13px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #fff;
  font-size: 13px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0 59px,
      rgba(150, 185, 220, 0.12) 60px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 110px,
      rgba(150, 185, 220, 0.1) 111px
    );
  border-radius: 7px;
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
.legend-line {
  width: 20px;
  border-top: 3px solid;
  display: inline-block;
}
.legend-line.average {
  border-top-style: dashed;
}
@media (max-width: 560px) {
  .history-chart {
    padding: 16px 12px;
  }
  .chart {
    aspect-ratio: 1200/430;
  }
  .y-axis-labels text {
    font-size: 18px;
  }
  .time-axis text {
    font-size: 14px;
  }
}
</style>
