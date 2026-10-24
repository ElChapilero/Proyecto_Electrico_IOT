<template>
  <section class="metric-block">
    <header class="section-heading">
      <div><span class="eyebrow" :style="{ color: accent }">Indicadores del circuito</span><h3>{{ title }}</h3></div>
    </header>
    <div class="cards-row">
      <article v-for="card in cards" :key="card.label" class="metric-card page-card" :style="{ '--metric-accent': accent }">
        <span>{{ card.label }}</span><strong>{{ card.value }}</strong><small>{{ card.unit }}</small>
      </article>
    </div>
    <HistoricalLineChart :title="chart.title" :unit="chart.unit" :color="accent" :points="chartPoints" :average="average" :period="period" />
  </section>
</template>

<script setup>
import HistoricalLineChart from "./HistoricalLineChart.vue";
defineProps({
  title: String,
  accent: String,
  cards: { type: Array, default: () => [] },
  chart: { type: Object, required: true },
  chartPoints: { type: Array, default: () => [] },
  average: { type: Number, default: null },
  period: { type: String, required: true },
});
</script>

<style scoped>
.metric-block { display: grid; gap: 14px; }.section-heading h3 { color: #e6f0fc; font-size: 21px; margin-top: 6px; }.eyebrow { color: var(--color-primary); font-size: 11px; text-transform: uppercase; letter-spacing: .1em; font-weight: 700; }.cards-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }.metric-card { min-height: 108px; padding: 17px 18px; display: grid; align-content: center; gap: 5px; border-top: 3px solid var(--metric-accent); }.metric-card span { color: #fff; font-size: 13px; }.metric-card strong { color: #fff; font-size: 25px; line-height: 1.1; }.metric-card small { color: #fff; font-size: 12px; }
@media (max-width: 650px) { .cards-row { grid-template-columns: 1fr; } }
</style>
