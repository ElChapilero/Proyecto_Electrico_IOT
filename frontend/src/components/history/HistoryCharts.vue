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
    :interpretation-period="periodLabel"
    :interpretation-daily-aggregation="isMultiDay"
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
  fromDate: { type: String, default: "" },
  toDate: { type: String, default: "" },
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
const isMultiDay = computed(() => {
  const from = parseFilterDate(props.fromDate);
  const to = parseFilterDate(props.toDate);
  if (from && to) return dateKey(from) !== dateKey(to);
  return new Set(
    props.points
      .map((point) => dateKey(parseProjectDate(point.fecha_hora)))
      .filter(Boolean),
  ).size > 1;
});
const chartTitle = computed(() => selected.value.title);
const chartUnit = computed(() => selected.value.unit);
const chartColor = computed(() => selected.value.color);
const explanation = computed(() => selected.value.explanation);
const entityLabel = computed(() => {
  const circuitNames = [...new Set(
    props.points.map((point) => String(point.circuito_nombre || "").trim()).filter(Boolean),
  )];
  if (circuitNames.length === 1) return circuitNames[0];
  if (circuitNames.length > 1) return "los circuitos seleccionados";
  const panelNames = [...new Set(
    props.points.map((point) => String(point.panel_nombre || "").trim()).filter(Boolean),
  )];
  if (panelNames.length === 1) return panelNames[0];
  return "el historial seleccionado";
});
const series = computed(() => [{
    id: "history",
    label: entityLabel.value,
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
}]);
function parseFilterDate(value) {
  if (!value) return null;
  const date = parseProjectDate(`${value}T12:00:00-05:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}
function dateKey(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(value);
}
const periodLabel = computed(() => {
  const selectedFrom = parseFilterDate(props.fromDate);
  const selectedTo = parseFilterDate(props.toDate);
  const dates = [selectedFrom, selectedTo].filter(Boolean);
  if (!dates.length) {
    dates.push(
      ...props.points
        .map((point) => parseProjectDate(point.fecha_hora))
        .filter((date) => Number.isFinite(date.getTime())),
    );
  }
  if (!dates.length) return "el periodo histórico seleccionado";
  dates.sort((a, b) => a - b);
  const format = (date) => new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bogota",
  }).format(date);
  return dates[0].getTime() === dates.at(-1).getTime()
    ? `el ${format(dates[0])}`
    : `el periodo comprendido entre el ${format(dates[0])} y el ${format(dates.at(-1))}`;
});
</script>
