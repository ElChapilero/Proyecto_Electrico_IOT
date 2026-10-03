<template>
  <article class="chart-card page-card">
    <header class="chart-header"><div><span class="eyebrow">Últimos 10 minutos</span><h3>{{ title }}</h3></div><span class="unit">{{ unit }}</span></header>
    <div v-if="!hasData" class="chart-empty">Todavía no hay mediciones para mostrar en este rango.</div>
    <svg v-else class="chart" viewBox="0 0 640 230" role="img" :aria-label="`${title} en ${unit}`">
      <g class="grid-lines"><line v-for="y in [25,75,125,175,215]" :key="y" x1="42" :y1="y" x2="628" :y2="y" /></g>
      <g v-for="series in normalizedSeries" :key="series.label"><polyline :points="series.points" :stroke="series.color" /><circle v-for="point in series.dots" :key="point.key" :cx="point.x" :cy="point.y" r="3" :fill="series.color" /></g>
      <text x="42" y="228">{{ startLabel }}</text><text x="628" y="228" text-anchor="end">{{ endLabel }}</text>
    </svg>
    <p class="explanation">{{ explanation }}</p>
    <div v-if="hasData" class="legend"><span v-for="series in normalizedSeries" :key="series.label"><i :style="{ background: series.color }"></i>{{ series.label }}</span></div>
  </article>
</template>
<script setup>
import { computed } from 'vue';
const props=defineProps({title:{type:String,required:true},unit:{type:String,required:true},explanation:{type:String,required:true},series:{type:Array,default:()=>[]}});
const hasData=computed(()=>props.series.some((series)=>series.points?.length));
const allPoints=computed(()=>props.series.flatMap((series)=>series.points || []).filter((point)=>Number.isFinite(Number(point.value))));
const minTime=computed(()=>Math.min(...props.series.flatMap((series)=>series.points||[]).map((point)=>new Date(point.time).getTime()).filter(Number.isFinite)));
const maxTime=computed(()=>Math.max(...props.series.flatMap((series)=>series.points||[]).map((point)=>new Date(point.time).getTime()).filter(Number.isFinite)));
const minValue=computed(()=>Math.min(...allPoints.value.map((point)=>Number(point.value))));
const maxValue=computed(()=>Math.max(...allPoints.value.map((point)=>Number(point.value))));
function timeLabel(value){return Number.isFinite(value)?new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—'}
const startLabel=computed(()=>timeLabel(minTime.value));const endLabel=computed(()=>timeLabel(maxTime.value));
const normalizedSeries=computed(()=>{const span=Math.max(1,maxTime.value-minTime.value);const valueSpan=Math.max(0.000001,maxValue.value-minValue.value);return props.series.map((series,index)=>{const points=series.points||[];const dots=points.map((point,pointIndex)=>{const x=42+((new Date(point.time).getTime()-minTime.value)/span)*586;const y=25+((maxValue.value-Number(point.value))/valueSpan)*190;return {key:`${index}-${pointIndex}`,x,y}});return {label:series.label,color:['#45ed80','#71adff','#f5bf3e','#ff7f9b','#c09cff'][index%5],points:dots.map(({x,y})=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' '),dots}}).filter((series)=>series.dots.length)});
</script>
<style scoped>.chart-card{padding:19px 20px}.chart-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.eyebrow{color:var(--color-primary);font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}.chart-header h3{color:#c8ddfb;font-size:16px;margin-top:6px}.unit{padding:5px 8px;border-radius:6px;background:var(--color-primary-soft);color:var(--color-primary);font-size:11px;font-weight:700}.chart{width:100%;height:205px;margin-top:13px;overflow:visible}.grid-lines line{stroke:rgba(139,170,207,.13);stroke-width:1}.chart polyline{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px currentColor)}.chart text{fill:#778aa2;font:10px var(--font-body)}.chart-empty{height:205px;margin-top:13px;display:grid;place-items:center;text-align:center;padding:24px;color:var(--color-muted);font-size:12px;border-radius:7px;background:repeating-linear-gradient(0deg,transparent 0 39px,rgba(120,155,195,.08) 40px),repeating-linear-gradient(90deg,transparent 0 76px,rgba(120,155,195,.06) 77px)}.explanation{margin-top:9px;color:var(--color-muted);font-size:11px;line-height:1.5}.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;color:#afc0d6;font-size:10px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:7px;height:7px;border-radius:50%}
</style>
