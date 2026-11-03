<template>
  <article class="history-chart page-card chart-card-base">
    <header class="chart-header chart-header-base">
      <div>
        <span class="eyebrow">{{ periodLabel }}</span>
        <h3>{{ title }}</h3>
      </div>
        <div class="chart-header-actions">
          <span class="chart-unit-base">{{ unit }}</span>
          <InfoPopover
            :title="metricInfoFor(metricKey).label"
            :summary="metricInfoFor(metricKey).summary"
            :how="metricInfoFor(metricKey).how"
            :detail="metricInfoFor(metricKey).detail"
            placement="header"
          />
        </div>
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
          :class="{
            'is-dimmed': selectedPointKey && selectedPointKey !== point.key,
            'is-point-selected': selectedPointKey === point.key,
          }"
          tabindex="0"
          :aria-label="`${title}: ${formatValue(point.value)} ${unit}, ${formatTooltipDate(point.time)}`"
          @mouseenter="showTooltip($event, point)"
          @mouseleave="hideTooltip"
          @focus="showTooltip($event, point)"
          @blur="hideTooltip"
          @touchstart.prevent="showTooltip($event, point)"
          @click="togglePointSelection(point)"
          @keydown.enter.prevent="togglePointSelection(point)"
          @keydown.space.prevent="togglePointSelection(point)"
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
    <InterpretationCard :text="interpretationText" :has-data="validPoints.length > 0" />
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { chartTooltipPosition } from "../../utils/chartTooltip";
import InfoPopover from "../common/InfoPopover.vue";
import { metricInfoFor } from "../../utils/metricInfo";
import { parseProjectDate } from "../../utils/chartDates";
import InterpretationCard from "../common/InterpretationCard.vue";
import { buildInterpretation } from "../../utils/interpretation";

const props = defineProps({
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  points: { type: Array, default: () => [] },
  average: { type: Number, default: null },
  period: { type: String, required: true },
  metricKey: { type: String, default: "potencia" },
});
const emit = defineEmits(["point-selected"]);

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
      Number.isFinite(parseProjectDate(point.time).getTime()),
  ),
);
const interpretationText = computed(() =>
  buildInterpretation({
    metricKey: props.metricKey,
    period: periodLabel.value,
    observations: validPoints.value,
  }),
);
const minValue = computed(() =>
  Math.min(...validPoints.value.map((point) => Number(point.value))),
);
const maxValue = computed(() =>
  Math.max(...validPoints.value.map((point) => Number(point.value))),
);
const minTime = computed(() =>
  Math.min(...validPoints.value.map((point) => parseProjectDate(point.time).getTime())),
);
const maxTime = computed(() =>
  Math.max(...validPoints.value.map((point) => parseProjectDate(point.time).getTime())),
);
const valueSpan = computed(() =>
  Math.max(0.000001, maxValue.value - minValue.value),
);
const timeSpan = computed(() => Math.max(1, maxTime.value - minTime.value));
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 3 });
}
function formatTooltipDate(value) {
  const date = parseProjectDate(value);
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
  const date = parseProjectDate(value);
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
  const position = chartTooltipPosition(container, marker);
  if (!position) return;
  tooltip.value = {
    ...point,
    ...position,
  };
}
function hideTooltip() {
  tooltip.value = null;
}
function togglePointSelection(point) {
  const key = circuitKey(point);
  if (selectedPointKey.value === point.key) {
    selectedCircuitKey.value = null;
    selectedPointKey.value = null;
    emit("point-selected", null);
    return;
  }
  selectedCircuitKey.value = key;
  selectedPointKey.value = point.key;
  emit("point-selected", point);
}
function clearSelection() {
  if (selectedPointKey.value === null && selectedCircuitKey.value === null) return;
  selectedCircuitKey.value = null;
  selectedPointKey.value = null;
  emit("point-selected", null);
}
function handleOutsideClick(event) {
  if (!chartWrap.value?.contains(event.target)) clearSelection();
}
onMounted(() => document.addEventListener("pointerdown", handleOutsideClick));
onBeforeUnmount(() => document.removeEventListener("pointerdown", handleOutsideClick));
watch(
  () => props.points.map((point) => `${circuitKey(point)}-${point.time}-${point.value}`).join("|"),
  () => {
    selectedCircuitKey.value = null;
    selectedPointKey.value = null;
    emit("point-selected", null);
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
  stroke: var(--chart-grid);
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
.chart .bar.is-dimmed {
  opacity: 0.28;
}
.chart .bar.is-point-selected {
  opacity: 1;
  stroke-width: 3;
  filter: drop-shadow(0 0 8px currentColor);
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
  stroke: var(--chart-axis);
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
  z-index: var(--chart-tooltip-z);
  transform: translate(-50%, -100%);
  display: grid;
  gap: 3px;
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
  min-height: var(--chart-empty-height);
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
  font-size: 13px;
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
