<template>
  <article class="chart-card page-card chart-card-base">
    <header class="chart-header chart-header-base">
      <div>
        <span class="eyebrow">{{ eyebrow }}</span>
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
    <div v-if="!hasData" class="chart-empty">
      {{ emptyMessage }}
    </div>
    <div v-else ref="chartWrap" class="chart-wrap">
      <svg
        class="chart"
        viewBox="0 0 1200 390"
        preserveAspectRatio="none"
        role="img"
        :aria-label="`${title} en ${unit}`"
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
          <g
            v-for="series in normalizedSeries"
            :key="series.label"
            class="series-group"
            :class="{
              'is-dimmed': selectedSeriesId && selectedSeriesId !== series.id,
              'is-selected': selectedSeriesId === series.id,
            }"
          >
          <polyline
            v-for="(segment, segmentIndex) in series.segments"
            :key="`${series.label}-${segmentIndex}`"
            :points="segment"
            :stroke="series.color"
            :stroke-dasharray="series.dashed ? '12 10' : null"
          />
          <template v-for="point in series.dots" :key="point.key">
            <rect
              v-if="series.marker === 'square'"
              :x="point.x - 4"
              :y="point.y - 4"
              width="8"
              height="8"
              :fill="series.color"
              :class="{ 'is-point-selected': selectedPointKey === point.key }"
              tabindex="0"
              :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`"
              @mouseenter="showTooltip($event, series, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, series, point)"
              @blur="hideTooltip"
              @touchstart.prevent="showTooltip($event, series, point)"
              @click="togglePointSelection(series, point)"
              @keydown.enter.prevent="togglePointSelection(series, point)"
              @keydown.space.prevent="togglePointSelection(series, point)"
            />
            <polygon
              v-else-if="series.marker === 'diamond'"
              :points="`${point.x},${point.y - 5} ${point.x + 5},${point.y} ${point.x},${point.y + 5} ${point.x - 5},${point.y}`"
              :fill="series.color"
              :class="{ 'is-point-selected': selectedPointKey === point.key }"
              tabindex="0"
              :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`"
              @mouseenter="showTooltip($event, series, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, series, point)"
              @blur="hideTooltip"
              @touchstart.prevent="showTooltip($event, series, point)"
              @click="togglePointSelection(series, point)"
              @keydown.enter.prevent="togglePointSelection(series, point)"
              @keydown.space.prevent="togglePointSelection(series, point)"
            />
            <polygon
              v-else-if="series.marker === 'triangle'"
              :points="`${point.x},${point.y - 5} ${point.x + 5},${point.y + 4} ${point.x - 5},${point.y + 4}`"
              :fill="series.color"
              :class="{ 'is-point-selected': selectedPointKey === point.key }"
              tabindex="0"
              :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`"
              @mouseenter="showTooltip($event, series, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, series, point)"
              @blur="hideTooltip"
              @touchstart.prevent="showTooltip($event, series, point)"
              @click="togglePointSelection(series, point)"
              @keydown.enter.prevent="togglePointSelection(series, point)"
              @keydown.space.prevent="togglePointSelection(series, point)"
            />
            <circle
              v-else
              :cx="point.x"
              :cy="point.y"
              r="4"
              :fill="series.color"
              :class="{ 'is-point-selected': selectedPointKey === point.key }"
              tabindex="0"
              :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`"
              @mouseenter="showTooltip($event, series, point)"
              @mouseleave="hideTooltip"
              @focus="showTooltip($event, series, point)"
              @blur="hideTooltip"
              @touchstart.prevent="showTooltip($event, series, point)"
              @click="togglePointSelection(series, point)"
              @keydown.enter.prevent="togglePointSelection(series, point)"
              @keydown.space.prevent="togglePointSelection(series, point)"
            />
          </template>
        </g>
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
        <strong>{{ tooltip.series }}</strong
        ><span>{{ formatValue(tooltip.value) }} {{ unit }}</span
        ><small>Fecha: {{ formatDate(tooltip.time) }}</small
        ><small>Hora: {{ formatClock(tooltip.time) }}</small>
      </div>
    </div>
    <p class="explanation">{{ explanation }}</p>
  <div v-if="hasData" class="legend">
      <span v-for="series in normalizedSeries" :key="series.label"
        ><i
          class="legend-marker"
          :class="series.marker"
          :style="{ background: series.color, borderColor: series.color }"
        ></i
        ><b
          class="legend-line"
          :class="{ dashed: series.dashed }"
          :style="{ borderTopColor: series.color }"
        ></b
        >{{ series.label }}</span
      >
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import {
  comparisonColor,
  comparisonMarkers,
} from "../../utils/chartVisuals";
import InfoPopover from "../common/InfoPopover.vue";
import { metricInfoFor } from "../../utils/metricInfo";

const props = defineProps({
  title: { type: String, required: true },
  metricKey: { type: String, default: "potencia" },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  explanation: { type: String, required: true },
  series: { type: Array, default: () => [] },
  eyebrow: { type: String, default: "Lecturas reales · últimos minutos" },
  emptyMessage: {
    type: String,
    default: "Todavía no hay mediciones para mostrar en este rango.",
  },
  gapThresholdMs: { type: Number, default: 15000 },
  timeTickFormat: { type: String, default: "time" },
  timeTickCount: { type: Number, default: 2 },
});
const chartWrap = ref(null);
const tooltip = ref(null);
const selectedSeriesId = ref(null);
const selectedPointKey = ref(null);
const hasData = computed(() =>
  props.series.some((series) => series.points?.length),
);
const allPoints = computed(() =>
  props.series
    .flatMap((series) => series.points || [])
    .filter((point) => Number.isFinite(Number(point.value))),
);
const minTime = computed(() =>
  Math.min(
    ...props.series
      .flatMap((series) => series.points || [])
      .map((point) => new Date(point.time).getTime())
      .filter(Number.isFinite),
  ),
);
const maxTime = computed(() =>
  Math.max(
    ...props.series
      .flatMap((series) => series.points || [])
      .map((point) => new Date(point.time).getTime())
      .filter(Number.isFinite),
  ),
);
const minValue = computed(() =>
  Math.min(...allPoints.value.map((point) => Number(point.value))),
);
const maxValue = computed(() =>
  Math.max(...allPoints.value.map((point) => Number(point.value))),
);
function formatDate(value) {
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(time)
    : "—";
}
function formatClock(value) {
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(time)
    : "—";
}
function formatTime(value) {
  return `${formatDate(value)} ${formatClock(value)}`;
}
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 3 });
}
const yTicks = computed(() => {
  const span = Math.max(0.000001, maxValue.value - minValue.value);
  return [0, 1, 2, 3, 4].map((index) => {
    const ratio = index / 4;
    return {
      y: 35 + ratio * 260,
      label: formatValue(maxValue.value - ratio * span),
    };
  });
});
const normalizedSeries = computed(() => {
  const span = Math.max(1, maxTime.value - minTime.value);
  const valueSpan = Math.max(0.000001, maxValue.value - minValue.value);
  const comparison = props.series.length > 1;
  const styleOrder = props.series
    .map((series) => String(series.id || series.label))
    .sort();
  return props.series
    .map((series, index) => {
      const points = [...(series.points || [])].sort(
        (a, b) => new Date(a.time) - new Date(b.time),
      );
      const dots = points.map((point, pointIndex) => {
        const x =
          100 +
          ((new Date(point.time).getTime() - minTime.value) / span) * 1052;
        const y =
          35 + ((maxValue.value - Number(point.value)) / valueSpan) * 255;
        return {
          key: `${index}-${pointIndex}`,
          x,
          y,
          time: point.time,
          value: point.value,
        };
      });
      const segments = [];
      let current = [];
      dots.forEach((point, pointIndex) => {
        const previous = dots[pointIndex - 1];
        if (
          previous &&
          new Date(point.time) - new Date(previous.time) > props.gapThresholdMs
        ) {
          if (current.length) segments.push(current.join(" "));
          current = [];
        }
        current.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`);
      });
      if (current.length) segments.push(current.join(" "));
      const styleIndex = styleOrder.indexOf(String(series.id || series.label));
      return {
        id: String(series.id || series.label),
        label: series.label,
        color: comparison
          ? comparisonColor(props.color, styleIndex % 3)
          : props.color,
        dashed: comparison && styleIndex % 2 === 1,
        marker: comparison
          ? comparisonMarkers[styleIndex % comparisonMarkers.length]
          : "circle",
        segments,
        dots,
      };
    })
    .filter((series) => series.dots.length);
});
function togglePointSelection(series, point) {
  const seriesId = series.id;
  const pointKey = point.key;
  if (selectedPointKey.value === pointKey) {
    selectedSeriesId.value = null;
    selectedPointKey.value = null;
    return;
  }
  selectedSeriesId.value = seriesId;
  selectedPointKey.value = pointKey;
}
watch(
  () => props.series.map((series) => String(series.id || series.label)).join("|"),
  () => {
    selectedSeriesId.value = null;
    selectedPointKey.value = null;
  },
);
const timeTicks = computed(() => {
  const points = normalizedSeries.value[0]?.dots || [];
  if (!points.length) return [];
  const count = Math.max(2, Math.min(props.timeTickCount, points.length));
  const visible = Array.from({ length: count }, (_, index) => {
    const pointIndex = Math.round(
      (index * (points.length - 1)) / Math.max(1, count - 1),
    );
    return points[pointIndex];
  }).filter((point, index, list) => list.indexOf(point) === index);
  const ticks = visible.map((point) => {
    const time = new Date(point.time);
    const label = new Intl.DateTimeFormat(
      "es-CO",
      props.timeTickFormat === "day-month"
        ? { day: "2-digit", month: "2-digit", timeZone: "America/Bogota" }
        : {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          },
    ).format(time);
    return { key: `time-${point.key}`, x: point.x, label };
  });
  if (props.timeTickFormat !== "day-month") return ticks;
  return ticks.filter(
    (tick, index, list) =>
      index === 0 ||
      index === list.length - 1 ||
      list.findIndex((candidate) => candidate.label === tick.label) === index,
  );
});
function showTooltip(event, series, point) {
  const target = event.currentTarget;
  const container = chartWrap.value?.getBoundingClientRect();
  const marker = target?.getBoundingClientRect();
  if (!container || !marker) return;
  const halfTooltip = Math.min(120, Math.max(70, container.width / 2 - 8));
  const markerCenter = marker.left + marker.width / 2;
  const left = Math.min(
    Math.max(markerCenter, container.left + halfTooltip),
    container.right - halfTooltip,
  );
  const nearTop = marker.top - container.top < 105;
  const top = nearTop ? marker.bottom + 10 : marker.top - 10;
  tooltip.value = {
    series: series.label,
    value: point.value,
    time: point.time,
    left,
    top,
    below: nearTop,
  };
}
function hideTooltip() {
  tooltip.value = null;
}
</script>

<style scoped>
.chart-card {
  position: relative;
  overflow: visible;
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
  min-width: 0;
  overflow: visible;
  padding-bottom: 8px;
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
.chart polyline {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 5px currentColor);
}
.series-group {
  transition: opacity var(--transition);
}
.series-group.is-dimmed {
  opacity: 0.28;
}
.series-group.is-selected {
  opacity: 1;
}
.chart circle,
.chart rect {
  cursor: pointer;
  stroke: var(--chart-active);
  stroke-width: 1.5;
  transition:
    r var(--transition),
    transform var(--transition);
}
.chart .is-point-selected {
  stroke-width: 3;
  filter: drop-shadow(0 0 8px currentColor);
}
.chart circle:hover,
.chart circle:focus {
  r: 7;
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
  stroke: var(--chart-axis);
  stroke-width: 1;
}
.time-axis text {
  font-size: 13px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding: 24px;
  color: #fff;
  font-size: 13px;
  border-radius: 7px;
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
}
.explanation {
  margin-top: 18px;
  color: #fff;
  font-size: 13px;
  line-height: 1.5;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  color: #fff;
  font-size: 13px;
}
.legend span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #fff;
  font-weight: 600;
}
.legend-marker {
  width: 9px;
  height: 9px;
  border: 1.5px solid;
  border-radius: 50%;
  flex: 0 0 auto;
}
.legend-marker.square {
  border-radius: 2px;
}
.legend-line {
  width: 19px;
  border-top: 3px solid;
  display: inline-block;
  flex: 0 0 auto;
}
.legend-line.dashed {
  border-top-style: dashed;
}
.chart polygon {
  cursor: pointer;
  stroke: #fff;
  stroke-width: 1.5;
}
.chart rect:hover,
.chart rect:focus {
  stroke-width: 2.5;
  outline: none;
}
.chart polygon:hover,
.chart polygon:focus {
  stroke-width: 2.5;
  outline: none;
}
.legend-marker.diamond {
  transform: rotate(45deg);
  border-radius: 2px;
}
.legend-marker.triangle {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  border: 0;
}
@media (max-width: 560px) {
  .chart-card {
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
  .chart circle {
    r: 7;
  }
  .chart circle:hover,
  .chart circle:focus {
    r: 10;
  }
  .chart polyline {
    stroke-width: 4;
  }
  .chart-empty {
    aspect-ratio: 1200/430;
  }
  .legend {
    font-size: 13px;
    line-height: 1.4;
  }
}
</style>
