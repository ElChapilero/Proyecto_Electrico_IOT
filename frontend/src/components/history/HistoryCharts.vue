<template>
  <RealtimeChart
    :title="chartTitle"
    :unit="chartUnit"
    :color="chartColor"
    :explanation="explanation"
    eyebrow="Histórico horario"
    empty-message="No hay mediciones para los filtros seleccionados."
    :gap-threshold-ms="2 * 60 * 60 * 1000"
    time-tick-format="day-month"
    :time-tick-count="6"
    :series="series"
    :metric-key="variable"
  />
</template>

<script setup>
import { computed } from "vue";
import RealtimeChart from "../realtime/RealtimeChart.vue";
import { parseProjectDate } from "../../utils/chartDates";

const props = defineProps({
  points: { type: Array, default: () => [] },
  variable: { type: String, required: true },
});

const metadata = {
  voltaje: {
    title: "Fuerza eléctrica histórica",
    unit: "V",
    color: "#FF3131",
    field: "promedio_voltaje",
    explanation:
      "Muestra la fuerza eléctrica registrada por hora según los filtros seleccionados.",
  },
  corriente: {
    title: "Cantidad de electricidad histórica",
    unit: "A",
    color: "#7B2CFF",
    field: "promedio_corriente",
    explanation:
      "Muestra cuánta electricidad circuló por hora según los filtros seleccionados.",
  },
  potencia: {
    title: "Potencia utilizada histórica",
    unit: "W",
    color: "#DFFF00",
    field: "promedio_potencia",
    explanation:
      "Muestra la potencia promedio registrada por hora según los filtros seleccionados.",
  },
  energia: {
    title: "Consumo de energía por hora",
    unit: "kWh",
    color: "#39FF14",
    field: "consumo_energia",
    explanation:
      "Muestra el consumo calculado por hora a partir de los datos horarios y los filtros seleccionados.",
  },
  factor_potencia: {
    title: "Aprovechamiento eléctrico histórico",
    unit: "FP",
    color: "#FF6A00",
    field: "promedio_factor_potencia",
    explanation:
      "Muestra el factor de potencia promedio por hora según los filtros seleccionados.",
  },
};

const selected = computed(() => metadata[props.variable] || metadata.voltaje);
const chartTitle = computed(() => selected.value.title);
const chartUnit = computed(() => selected.value.unit);
const chartColor = computed(() => selected.value.color);
const explanation = computed(() => selected.value.explanation);
const series = computed(() => [
  {
    id: "history",
    label: "Historial filtrado",
    points: props.points
      .map((point) => ({
        time: point.fecha_hora,
        value: Number(point[selected.value.field]),
      }))
      .filter(
        (point) =>
          Number.isFinite(parseProjectDate(point.time).getTime()) &&
          Number.isFinite(point.value),
      )
      .sort((a, b) => parseProjectDate(a.time) - parseProjectDate(b.time)),
  },
]);
</script>
