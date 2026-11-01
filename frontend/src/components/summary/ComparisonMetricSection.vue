<template>
  <section class="metric-block">
    <header class="section-heading">
      <div>
        <span class="eyebrow" :style="{ color: accent }"
          >Comparativa por {{ entityLabel }}</span
        >
        <h3>{{ title }}</h3>
      </div>
    </header>
    <div class="cards-row">
      <article
        v-for="card in cards"
        :key="card.label"
        class="metric-card metric-card-base page-card"
        :style="{ '--metric-accent': accent }"
      >
        <span>{{ card.label }}</span
        ><strong>{{ card.value }}</strong
        ><small>{{ card.entity }} · {{ unit }}</small>
        <InfoPopover
          :title="metricInfoFor(metricKey).label"
          :summary="metricInfoFor(metricKey).summary"
          :how="metricInfoFor(metricKey).how"
          :detail="metricInfoFor(metricKey).detail"
        />
      </article>
    </div>
    <ComparisonBarChart
      :title="`Comparación de ${title.toLowerCase()}`"
      :unit="unit"
      :color="accent"
      :rows="rows"
      :value-key="valueKey"
      :entity-label="entityLabel"
      :metric-key="metricKey"
    />
  </section>
</template>

<script setup>
import ComparisonBarChart from "./ComparisonBarChart.vue";
import InfoPopover from "../common/InfoPopover.vue";
import { metricInfoFor } from "../../utils/metricInfo";
defineProps({
  title: String,
  accent: String,
  unit: String,
  rows: { type: Array, default: () => [] },
  valueKey: String,
  entityLabel: String,
  cards: { type: Array, default: () => [] },
  metricKey: { type: String, default: "potencia" },
});
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
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.cards-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 650px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
</style>
