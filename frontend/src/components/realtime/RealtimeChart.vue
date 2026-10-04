<template>
  <article class="chart-card page-card">
    <header class="chart-header">
      <div><span class="eyebrow">Últimos 10 minutos</span><h3>{{ title }}</h3></div>
      <span class="unit">{{ unit }}</span>
    </header>
    <div v-if="!hasData" class="chart-empty">Todavía no hay mediciones para mostrar en este rango.</div>
    <div v-else ref="chartWrap" class="chart-wrap">
      <svg class="chart" viewBox="0 0 1200 360" preserveAspectRatio="none" role="img" :aria-label="`${title} en ${unit}`">
        <g class="grid-lines"><line v-for="y in [35,100,165,230,295]" :key="y" x1="48" :y1="y" x2="1152" :y2="y" /></g>
        <g v-for="series in normalizedSeries" :key="series.label">
          <polyline :points="series.points" :stroke="series.color" />
          <circle v-for="point in series.dots" :key="point.key" :cx="point.x" :cy="point.y" r="4" :fill="series.color" tabindex="0" :aria-label="`${series.label}: ${formatValue(point.value)} ${unit}, ${formatTime(point.time)}`" @mouseenter="showTooltip($event, series, point)" @mouseleave="hideTooltip" @focus="showTooltip($event, series, point)" @blur="hideTooltip" @touchstart.prevent="showTooltip($event, series, point)" />
        </g>
        <text x="48" y="348">{{ startLabel }}</text><text x="1152" y="348" text-anchor="end">{{ endLabel }}</text>
      </svg>
      <div v-if="tooltip" class="chart-tooltip" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }" role="status">
        <strong>{{ tooltip.series }}</strong><span>{{ formatValue(tooltip.value) }} {{ unit }}</span><small>{{ formatTime(tooltip.time) }}</small>
      </div>
    </div>
    <p class="explanation">{{ explanation }}</p>
    <div v-if="hasData" class="legend"><span v-for="series in normalizedSeries" :key="series.label"><i :style="{ background: series.color }"></i>{{ series.label }}</span></div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ title: { type: String, required: true }, unit: { type: String, required: true }, explanation: { type: String, required: true }, series: { type: Array, default: () => [] } });
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
const startLabel = computed(() => Number.isFinite(minTime.value) ? new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(minTime.value)) : '—');
const endLabel = computed(() => Number.isFinite(maxTime.value) ? new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(maxTime.value)) : '—');
const normalizedSeries = computed(() => { const span = Math.max(1, maxTime.value - minTime.value); const valueSpan = Math.max(0.000001, maxValue.value - minValue.value); return props.series.map((series, index) => { const points = series.points || []; const dots = points.map((point, pointIndex) => { const x = 48 + ((new Date(point.time).getTime() - minTime.value) / span) * 1104; const y = 35 + ((maxValue.value - Number(point.value)) / valueSpan) * 260; return { key: `${index}-${pointIndex}`, x, y, time: point.time, value: point.value }; }); return { label: series.label, color: ['#45ed80', '#71adff', '#f5bf3e', '#ff7f9b', '#c09cff'][index % 5], points: dots.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), dots }; }).filter((series) => series.dots.length); });
function showTooltip(event, series, point) { const target = event.currentTarget; const container = chartWrap.value?.getBoundingClientRect(); const marker = target?.getBoundingClientRect(); if (!container || !marker) return; tooltip.value = { series: series.label, value: point.value, time: point.time, left: Math.min(Math.max(marker.left - container.left + marker.width / 2, 70), container.width - 70), top: Math.max(marker.top - container.top - 12, 8) }; }
function hideTooltip() { tooltip.value = null; }
</script>

<style scoped>
.chart-card{width:100%;min-width:0;padding:19px 20px}.chart-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.eyebrow{color:var(--color-primary);font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}.chart-header h3{color:#e6f0fc;font-size:18px;margin-top:6px}.unit{padding:5px 8px;border-radius:6px;background:var(--color-primary-soft);color:#dceaff;font-size:12px;font-weight:700}.chart-wrap{position:relative;width:100%;min-width:0}.chart{display:block;width:100%;min-width:100%;height:320px;margin-top:13px;overflow:visible}.grid-lines line{stroke:rgba(180,205,232,.22);stroke-width:1}.chart polyline{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px currentColor)}.chart circle{cursor:pointer;stroke:#fff;stroke-width:1.5;transition:r var(--transition)}.chart circle:hover,.chart circle:focus{r:7;outline:none}.chart text{fill:#e4edf8;font:16px var(--font-body);font-weight:600}.chart-tooltip{position:absolute;z-index:2;transform:translate(-50%,-100%);display:grid;gap:3px;min-width:140px;max-width:220px;padding:9px 11px;border:1px solid rgba(150,190,235,.35);border-radius:8px;background:#0b1728;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font-size:12px;pointer-events:none}.chart-tooltip strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eaf3ff}.chart-tooltip span{color:#fff;font-weight:700}.chart-tooltip small{color:#d2deec}.chart-empty{height:320px;margin-top:13px;display:grid;place-items:center;text-align:center;padding:24px;color:#d2deec;font-size:13px;border-radius:7px;background:repeating-linear-gradient(0deg,transparent 0 59px,rgba(150,185,220,.12) 60px),repeating-linear-gradient(90deg,transparent 0 110px,rgba(150,185,220,.1) 111px)}.explanation{margin-top:9px;color:#d2deec;font-size:13px;line-height:1.5}.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;color:#d2deec;font-size:12px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:8px;height:8px;border-radius:50%}
@media(max-width:560px){.chart-card{padding:16px 12px}.chart{height:300px}.chart text{font-size:19px}.chart circle{r:7}.chart circle:hover,.chart circle:focus{r:10}.chart polyline{stroke-width:4}.chart-empty{height:300px}.legend{font-size:13px;line-height:1.4}}
</style>
