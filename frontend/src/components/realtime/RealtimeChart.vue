<template>
  <article class="chart-card page-card">
    <header class="chart-header">
      <div><span class="eyebrow">Lecturas reales · últimos minutos</span><h3>{{ title }}</h3></div>
      <span class="unit">{{ unit }}</span>
    </header>
    <div v-if="!hasData" class="chart-empty">Todavía no hay mediciones para mostrar en este rango.</div>
    <div v-else ref="chartWrap" class="chart-wrap">
      <svg class="chart" viewBox="0 0 1200 390" preserveAspectRatio="none" role="img" :aria-label="`${title} en ${unit}`">
        <g class="grid-lines"><line v-for="tick in yTicks" :key="tick.y" x1="100" :y1="tick.y" x2="1152" :y2="tick.y" /></g>
        <g class="y-axis-labels"><text v-for="tick in yTicks" :key="`label-${tick.y}`" x="92" :y="tick.y + 5" text-anchor="end">{{ tick.label }}</text></g>
        <g v-for="series in normalizedSeries" :key="series.label">
          <polyline v-for="(segment, segmentIndex) in series.segments" :key="`${series.label}-${segmentIndex}`" :points="segment" :stroke="series.color" :stroke-dasharray="series.dashed ? '12 10' : null" />
          <template v-for="point in series.dots" :key="point.key">
            <rect v-if="series.dashed" :x="point.x - 4" :y="point.y - 4" width="8" height="8" :fill="series.color" tabindex="0" :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`" @mouseenter="showTooltip($event, series, point)" @mouseleave="hideTooltip" @focus="showTooltip($event, series, point)" @blur="hideTooltip" @touchstart.prevent="showTooltip($event, series, point)" />
            <circle v-else :cx="point.x" :cy="point.y" r="4" :fill="series.color" tabindex="0" :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`" @mouseenter="showTooltip($event, series, point)" @mouseleave="hideTooltip" @focus="showTooltip($event, series, point)" @blur="hideTooltip" @touchstart.prevent="showTooltip($event, series, point)" />
          </template>
        </g>
        <g class="time-axis"><line v-for="tick in timeTicks" :key="`mark-${tick.key}`" :x1="tick.x" y1="290" :x2="tick.x" y2="305" /><text v-for="tick in timeTicks" :key="tick.key" :x="tick.x" y="330" text-anchor="middle">{{ tick.label }}</text></g>
      </svg>
      <div v-if="tooltip" class="chart-tooltip" :class="{ 'tooltip-below': tooltip.below }" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }" role="status">
        <strong>{{ tooltip.series }}</strong><span>{{ formatValue(tooltip.value) }} {{ unit }}</span><small>Fecha y hora: {{ formatTime(tooltip.time) }}</small>
      </div>
    </div>
    <p class="explanation">{{ explanation }}</p>
    <div v-if="hasData" class="legend"><span v-for="series in normalizedSeries" :key="series.label"><i :style="{ background: series.color }"></i>{{ series.label }}</span></div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ title: { type: String, required: true }, unit: { type: String, required: true }, color: { type: String, required: true }, explanation: { type: String, required: true }, series: { type: Array, default: () => [] } });
const chartWrap = ref(null);
const tooltip = ref(null);
const hasData = computed(() => props.series.some((series) => series.points?.length));
const allPoints = computed(() => props.series.flatMap((series) => series.points || []).filter((point) => Number.isFinite(Number(point.value))));
const minTime = computed(() => Math.min(...props.series.flatMap((series) => series.points || []).map((point) => new Date(point.time).getTime()).filter(Number.isFinite)));
const maxTime = computed(() => Math.max(...props.series.flatMap((series) => series.points || []).map((point) => new Date(point.time).getTime()).filter(Number.isFinite)));
const minValue = computed(() => Math.min(...allPoints.value.map((point) => Number(point.value))));
const maxValue = computed(() => Math.max(...allPoints.value.map((point) => Number(point.value))));
function formatTime(value) { const time = new Date(value); return Number.isFinite(time.getTime()) ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', hour12: false }).format(time) : '—'; }
function formatValue(value) { return Number(value).toLocaleString('es-CO', { maximumFractionDigits: 3 }); }
const yTicks = computed(() => { const span = Math.max(0.000001, maxValue.value - minValue.value); return [0, 1, 2, 3, 4].map((index) => { const ratio = index / 4; return { y: 35 + ratio * 260, label: formatValue(maxValue.value - ratio * span) }; }); });
const GAP_THRESHOLD_MS=15000;
function comparisonColor(hex, index) { const normalized = hex.replace('#', ''); const red = parseInt(normalized.slice(0, 2), 16); const green = parseInt(normalized.slice(2, 4), 16); const blue = parseInt(normalized.slice(4, 6), 16); const mix = Math.min(0.62, index * 0.28); return `rgb(${Math.round(red + (255 - red) * mix)}, ${Math.round(green + (255 - green) * mix)}, ${Math.round(blue + (255 - blue) * mix)})`; }
const normalizedSeries = computed(() => { const span = Math.max(1, maxTime.value - minTime.value); const valueSpan = Math.max(0.000001, maxValue.value - minValue.value); return props.series.map((series, index) => { const points = [...(series.points || [])].sort((a,b)=>new Date(a.time)-new Date(b.time)); const dots = points.map((point, pointIndex) => { const x = 100 + ((new Date(point.time).getTime() - minTime.value) / span) * 1052; const y = 35 + ((maxValue.value - Number(point.value)) / valueSpan) * 255; return { key: `${index}-${pointIndex}`, x, y, time: point.time, value: point.value }; }); const segments=[];let current=[];dots.forEach((point,pointIndex)=>{const previous=dots[pointIndex-1];if(previous&&new Date(point.time)-new Date(previous.time)>GAP_THRESHOLD_MS){if(current.length)segments.push(current.join(' '));current=[]}current.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`)});if(current.length)segments.push(current.join(' '));return { label: series.label, color: comparisonColor(props.color, index), dashed: index === 1, segments, dots }; }).filter((series) => series.dots.length); });
const timeTicks = computed(() => { const points = normalizedSeries.value[0]?.dots || []; const visible = points.length > 1 ? [points[0], points[points.length - 1]] : points; return visible.map((point) => { const time = new Date(point.time); const label = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(time); return { key: `time-${point.key}`, x: point.x, label }; }); });
function showTooltip(event, series, point) { const target = event.currentTarget; const container = chartWrap.value?.getBoundingClientRect(); const marker = target?.getBoundingClientRect(); if (!container || !marker) return; const halfTooltip = Math.min(120, Math.max(70, container.width / 2 - 8)); const markerCenter = marker.left + marker.width / 2; const left = Math.min(Math.max(markerCenter, container.left + halfTooltip), container.right - halfTooltip); const nearTop = marker.top - container.top < 105; const top = nearTop ? marker.bottom + 10 : marker.top - 10; tooltip.value = { series: series.label, value: point.value, time: point.time, left, top, below: nearTop }; }
function hideTooltip() { tooltip.value = null; }
</script>

<style scoped>
.chart-card{width:100%;min-width:0;padding:19px 20px}.chart-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.eyebrow{color:var(--color-primary);font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}.chart-header h3{color:#e6f0fc;font-size:18px;margin-top:6px}.unit{padding:5px 8px;border-radius:6px;background:var(--color-primary-soft);color:#dceaff;font-size:12px;font-weight:700}.chart-wrap{position:relative;width:100%;min-width:0;overflow:visible;padding-bottom:8px}.chart{display:block;width:100%;height:auto;aspect-ratio:1200/390;margin-top:13px;overflow:visible}.grid-lines line{stroke:rgba(180,205,232,.22);stroke-width:1}.chart polyline{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px currentColor)}.chart circle{cursor:pointer;stroke:#fff;stroke-width:1.5;transition:r var(--transition)}.chart circle:hover,.chart circle:focus{r:7;outline:none}.chart text{fill:#e4edf8;font-family:var(--font-body);font-weight:600}.y-axis-labels text{font-size:15px}.time-axis line{stroke:rgba(210,230,250,.65);stroke-width:1}.time-axis text{font-size:13px}.chart-tooltip{position:fixed;z-index:2;transform:translate(-50%,-100%);display:grid;gap:3px;min-width:140px;max-width:220px;padding:9px 11px;border:1px solid rgba(150,190,235,.35);border-radius:8px;background:#0b1728;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font-size:12px;pointer-events:none}.chart-tooltip.tooltip-below{transform:translate(-50%,0)}.chart-tooltip strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eaf3ff}.chart-tooltip span{color:#fff;font-weight:700}.chart-tooltip small{color:#d2deec}.chart-empty{height:auto;aspect-ratio:1200/390;margin-top:13px;display:grid;place-items:center;text-align:center;padding:24px;color:#d2deec;font-size:13px;border-radius:7px;background:repeating-linear-gradient(0deg,transparent 0 59px,rgba(150,185,220,.12) 60px),repeating-linear-gradient(90deg,transparent 0 110px,rgba(150,185,220,.1) 111px)}.explanation{margin-top:18px;color:#d2deec;font-size:13px;line-height:1.5}.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;color:#d2deec;font-size:12px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:8px;height:8px;border-radius:50%}
@media(max-width:560px){.chart-card{padding:16px 12px}.chart{aspect-ratio:1200/430}.y-axis-labels text{font-size:18px}.time-axis text{font-size:14px}.chart circle{r:7}.chart circle:hover,.chart circle:focus{r:10}.chart polyline{stroke-width:4}.chart-empty{aspect-ratio:1200/430}.legend{font-size:13px;line-height:1.4}}
</style>
