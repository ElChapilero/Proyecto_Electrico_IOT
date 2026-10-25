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
        class="metric-card page-card"
        :style="{ '--metric-accent': accent }"
      >
        <span>{{ card.label }}</span
        ><strong>{{ card.value }}</strong
        ><small>{{ card.entity }} · {{ unit }}</small>
      </article>
    </div>
    <ComparisonBarChart
      :title="`Comparación de ${title.toLowerCase()}`"
      :unit="unit"
      :color="accent"
      :rows="rows"
      :value-key="valueKey"
      :entity-label="entityLabel"
    />
  </section>
</template>

<script setup>
import ComparisonBarChart from "./ComparisonBarChart.vue";
defineProps({
  title: String,
  accent: String,
  unit: String,
  rows: { type: Array, default: () => [] },
  valueKey: String,
  entityLabel: String,
  cards: { type: Array, default: () => [] },
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
.metric-card {
  min-height: 108px;
  padding: 17px 18px;
  display: grid;
  align-content: center;
  gap: 5px;
  border-top: 3px solid var(--metric-accent);
}
.metric-card span {
  color: #fff;
  font-size: 13px;
}
.metric-card strong {
  color: #fff;
  font-size: 25px;
  line-height: 1.1;
}
.metric-card small {
  color: #fff;
  font-size: 13px;
}
@media (max-width: 650px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
</style>
