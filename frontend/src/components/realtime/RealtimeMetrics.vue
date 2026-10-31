<template>
  <div class="metrics">
    <article
      v-for="metric in metrics"
      :key="metric.key"
      class="metric-card-base page-card"
      :style="{ '--metric-accent': metric.color || 'var(--color-primary)' }"
    >
      <span>{{ metric.label }}</span
      ><strong>{{
        formatMetric(record.latest?.[metric.key], metric.decimals)
      }}</strong
      ><small>{{ metric.unit }}</small>
    </article>
  </div>
</template>
<script setup>
import { formatMetric } from "../../composables/useRealtimeData";
defineProps({
  record: { type: Object, required: true },
  metrics: { type: Array, required: true },
});
</script>
<style scoped>
.metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 11px;
}
@media (max-width: 900px) {
  .metrics {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 560px) {
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .metric-card-base:last-child {
    grid-column: 1/-1;
  }
}
</style>
