<template>
  <section class="measurement-group">
    <div class="group-heading">
      <div>
        <span class="eyebrow"
          >{{ panelLabel(record.panel) }} · {{ record.device.nombre }}</span
        >
        <h3>{{ record.circuit.nombre }}</h3>
      </div>
      <span class="group-state">{{
        record.measurements.length ? "Con mediciones" : "Sin mediciones"
      }}</span>
    </div>
    <RealtimeMetrics :record="record" :metrics="metrics" />
  </section>
</template>
<script setup>
import RealtimeMetrics from "./RealtimeMetrics.vue";
import { panelLabel } from "../../composables/useRealtimeData";
defineProps({
  record: { type: Object, required: true },
  metrics: { type: Array, required: true },
});
</script>
<style scoped>
.measurement-group {
  display: grid;
  gap: 10px;
}
.group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.group-heading h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.group-state {
  color: #d6e2f0;
  font-size: 13px;
}
@media (max-width: 560px) {
  .group-heading {
    align-items: flex-start;
    display: block;
  }
  .group-state {
    display: block;
    margin-top: 8px;
  }
}
</style>
