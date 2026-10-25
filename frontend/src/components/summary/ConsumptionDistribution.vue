<template>
  <article class="distribution page-card">
    <header>
      <div>
        <span class="eyebrow">Distribución por {{ entityLabel }}</span>
        <h3>Participación del consumo</h3>
      </div>
      <strong>{{ formatValue(total) }} kWh</strong>
    </header>
    <div v-if="!items.length" class="empty">
      No hay consumo comparable para este periodo.
    </div>
    <div v-else class="distribution-body">
      <div
        class="donut"
        :style="{ background: gradient }"
        role="img"
        :aria-label="`Distribución porcentual del consumo por ${entityLabel}`"
      >
        <div>
          <strong>{{ formatValue(total) }}</strong
          ><small>kWh total</small>
        </div>
      </div>
      <ul class="legend">
        <li v-for="item in items" :key="item.key">
          <i :style="{ background: item.color }"></i
          ><span>{{ item.label }}</span
          ><strong>{{ formatPercent(item.porcentaje_consumo) }}%</strong>
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  entityLabel: { type: String, default: "entidad" },
});
const colors = [
  "#39FF14",
  "#DFFF00",
  "#FF3131",
  "#7B2CFF",
  "#FF6A00",
  "#22D3EE",
  "#F472B6",
  "#A78BFA",
];
const items = computed(() =>
  props.rows
    .map((row, index) => ({
      ...row,
      key: `${index}-${row.panel_id || row.circuito_id}`,
      label:
        props.entityLabel === "panel"
          ? row.panel_nombre
          : row.circuito_nombre || `Circuito ${row.circuito}`,
      porcentaje: Number(row.porcentaje_consumo) || 0,
      color: colors[index % colors.length],
    }))
    .filter((row) => row.porcentaje > 0),
);
const total = computed(() => Number(props.rows[0]?.consumo_total) || 0);
const gradient = computed(() => {
  let start = 0;
  return `conic-gradient(${items.value
    .map((item) => {
      const end = start + item.porcentaje;
      const part = `${item.color} ${start}% ${end}%`;
      start = end;
      return part;
    })
    .join(", ")})`;
});
function formatValue(value) {
  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatPercent(value) {
  return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 1 });
}
</script>

<style scoped>
.distribution {
  padding: 19px 20px;
}
.distribution header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.distribution h3 {
  color: #e6f0fc;
  font-size: 18px;
  margin-top: 6px;
}
.distribution header > strong {
  color: #fff;
  white-space: nowrap;
  font-size: 14px;
}
.distribution-body {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  align-items: center;
  gap: 24px;
  min-height: 240px;
}
.donut {
  position: relative;
  width: 210px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.donut::before {
  content: "";
  position: absolute;
  width: 142px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #18283c;
}
.donut > div {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  place-items: center;
  color: #fff;
}
.donut strong {
  font-size: 22px;
}
.donut small {
  font-size: 12px;
}
.legend {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.legend li {
  display: grid;
  grid-template-columns: 13px 1fr auto;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
}
.legend i {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}
.legend strong {
  font-size: 12px;
}
.empty {
  min-height: 240px;
  display: grid;
  place-items: center;
  color: #fff;
}
@media (max-width: 650px) {
  .distribution-body {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .legend {
    width: 100%;
  }
}
</style>
