<template>
  <section class="metric-block">
    <header class="section-heading">
      <div>
        <span class="eyebrow" :style="{ color: accent }"
          >Indicadores del circuito</span
        >
        <h3>{{ title }}</h3>
      </div>
    </header>
    <div class="cards-row">
      <article
        v-for="card in displayedCards"
        :key="card.label"
        class="metric-card metric-card-base page-card"
        :style="{ '--metric-accent': accent }"
      >
        <span>{{ card.label }}</span
        ><strong>{{ card.value }}</strong
        ><small>{{ card.unit }}</small>
        <InfoPopover
          :title="metricInfoFor(metricKey).label"
          :summary="metricInfoFor(metricKey).summary"
          :how="metricInfoFor(metricKey).how"
          :detail="metricInfoFor(metricKey).detail"
        />
      </article>
    </div>
    <HistoricalLineChart
      :title="chart.title"
      :unit="chart.unit"
      :color="accent"
      :points="chartPoints"
      :average="average"
      :period="period"
      :metric-key="metricKey"
      @point-selected="selectPoint"
    />
  </section>
</template>

<script setup>
import HistoricalLineChart from "./HistoricalLineChart.vue";
import InfoPopover from "../common/InfoPopover.vue";
import { metricInfoFor } from "../../utils/metricInfo";
import { formatVisualNumber } from "../../utils/numberFormatting";
import { computed, ref } from "vue";
const props = defineProps({
  title: String,
  accent: String,
  cards: { type: Array, default: () => [] },
  chart: { type: Object, required: true },
  chartPoints: { type: Array, default: () => [] },
  average: { type: Number, default: null },
  period: { type: String, required: true },
  metricKey: { type: String, default: "potencia" },
});
const selectedPoint = ref(null);
const displayedCards = computed(() => {
  if (!selectedPoint.value) return props.cards;
  const point = selectedPoint.value;
  const periodLabel = point.periodLabel || "periodo seleccionado";
  const value = formatCardValue(point.value, point.decimals);
  const max = formatCardValue(point.maxValue, point.decimals);
  const min = formatCardValue(point.minValue, point.decimals);
  return [
    { label: `Promedio de ${periodLabel}`, value, unit: props.chart.unit },
    { label: `Máximo de ${periodLabel}`, value: max, unit: props.chart.unit },
    { label: `Mínimo de ${periodLabel}`, value: min, unit: props.chart.unit },
  ];
});
function formatCardValue(value) {
  const formatted = formatVisualNumber(value);
  return formatted === "—" ? "No disponible" : formatted;
}
function selectPoint(point) {
  selectedPoint.value = point;
}
</script>

<style scoped>
.metric-block {
  display: grid;
  gap: 14px;
}
.section-heading h3 {
  color: #e6f0fc;
  font-size: 21px;
  margin-top: 6px;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.cards-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 650px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
</style>
