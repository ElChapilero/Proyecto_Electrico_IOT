<template>
  <div class="history-view">
    <header class="welcome">
      <div>
        <span class="eyebrow">Consulta de datos</span>
        <h2>Historial de mediciones</h2>
        <p>
          {{
            predio.predioActual.value?.nombre ||
            "Selecciona un predio para comenzar"
          }}
        </p>
      </div>
    </header>
    <ErrorState v-if="loadError" :message="loadError" retry @retry="loadAll" />
    <LoadingState
      v-else-if="loadingStructure"
      message="Cargando filtros y estructura eléctrica…"
    />
    <EmptyState
      v-else-if="!predio.predioId.value"
      title="Selecciona un predio"
      message="Elige un predio en la barra superior para consultar el historial."
    />
    <template v-else>
      <section class="filters page-card">
        <BaseSelect label="Panel" v-model="selectedPanelId"
          ><option
            value="__combined-panels__"
            :disabled="mainPanels.length < 2"
          >
            Paneles Juntos - Pri
          </option>
          <option
            v-for="panel in panels"
            :key="panel.id"
            :value="panel.id"
            :disabled="disabledPanelIds.has(String(panel.id))"
          >
            {{ panelOptionLabel(panel) }}
          </option></BaseSelect
        >
        <BaseSelect label="Circuito" v-model="selectedCircuitId"
          ><option value="__combined-circuits__">Circuitos Juntos</option>
          <option
            v-if="selectedPanelId !== COMBINED_PANELS"
            v-for="record in panelCircuits"
            :key="record.circuit.id"
            :value="record.circuit.id"
          >
            {{ record.circuit.nombre }}
          </option></BaseSelect
        >
        <BaseSelect label="Variable" v-model="selectedVariable"
          ><option v-for="item in variables" :key="item.key" :value="item.key">
            {{ item.label }}
          </option></BaseSelect
        >
        <label class="field"
          ><span>Fecha inicial</span
          ><input v-model="fromDate" type="date" @change="loadHistory"
        /></label>
        <label class="field"
          ><span>Fecha final</span
          ><input v-model="toDate" type="date" @change="loadHistory"
        /></label>
      </section>
      <LoadingState
        v-if="loadingHistory"
        message="Consultando mediciones horarias…"
      />
      <ErrorState
        v-else-if="historyError"
        :message="historyError"
        retry
        @retry="loadHistory"
      />
      <HistoryCharts
        v-else
        :points="historyRows"
        :variable="selectedVariable"
      />
      <section class="table-filters page-card">
        <div>
          <span class="eyebrow">Filtros de tabla</span>
          <h3>Detalle de mediciones</h3>
        </div>
        <label class="field"
          ><span>Mostrar por</span
          ><select v-model="tableMode">
            <option value="hour">Hora</option>
            <option value="day">Día</option>
          </select></label
        >
      </section>
      <section class="table-card page-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>{{ tableMode === "day" ? "Día" : "Hora" }}</th>
                <th>Panel</th>
                <th>Circuito</th>
                <th>Voltaje</th>
                <th>Corriente</th>
                <th>Potencia</th>
                <th>Energía</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in tableRows"
                :key="`${row.fecha_hora}-${row.circuito_id}-${index}`"
              >
                <td>{{ formatDate(row.fecha_hora) }}</td>
                <td>
                  {{
                    tableMode === "day"
                      ? formatDay(row.fecha_hora)
                      : formatHour(row.fecha_hora)
                  }}
                </td>
                <td>{{ row.panel_nombre || "—" }}</td>
                <td>{{ row.circuito_nombre || "—" }}</td>
                <td>{{ display(row.promedio_voltaje, "V") }}</td>
                <td>{{ display(row.promedio_corriente, "A") }}</td>
                <td>{{ display(row.promedio_potencia, "W") }}</td>
                <td>{{ display(row.consumo_energia, "kWh") }}</td>
              </tr>
              <tr v-if="!tableRows.length">
                <td colspan="8" class="empty-row">
                  No hay filas para los filtros seleccionados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import BaseSelect from "../components/common/BaseSelect.vue";
import EmptyState from "../components/common/EmptyState.vue";
import ErrorState from "../components/common/ErrorState.vue";
import LoadingState from "../components/common/LoadingState.vue";
import HistoryCharts from "../components/history/HistoryBarChart.vue";
import { tiempoRealApi } from "../services/tiempoRealApi";
import { usePredioStore } from "../stores/predioStore";
import { orderPanels, panelOptionLabel } from "../utils/panelOptions";

const COMBINED_PANELS = "__combined-panels__";
const COMBINED_CIRCUITS = "__combined-circuits__";
const predio = usePredioStore();
const panels = ref([]);
const panelsWithDevices = ref([]);
const mainPanels = ref([]);
const records = ref([]);
const historyRows = ref([]);
const selectedPanelId = ref("");
const selectedCircuitId = ref(COMBINED_CIRCUITS);
const selectedVariable = ref("voltaje");
const fromDate = ref("");
const toDate = ref("");
const tableMode = ref("hour");
const loadingStructure = ref(false);
const loadingHistory = ref(false);
const loadError = ref("");
const historyError = ref("");
const variables = [
  { key: "voltaje", label: "Voltaje" },
  { key: "corriente", label: "Corriente" },
  { key: "potencia", label: "Potencia" },
  { key: "energia", label: "Energía" },
  { key: "factor_potencia", label: "Factor de potencia" },
];
const panelCircuits = computed(() =>
  records.value.filter(
    (record) => String(record.panel.id) === String(selectedPanelId.value),
  ),
);
const disabledPanelIds = computed(
  () =>
    new Set(
      panels.value
        .filter(
          (panel) =>
            !panelsWithDevices.value.some(
              (item) => String(item.id) === String(panel.id),
            ),
        )
        .map((panel) => String(panel.id)),
    ),
);
const tableRows = computed(() => {
  if (tableMode.value === "hour") return historyRows.value;
  const groups = new Map();
  for (const row of historyRows.value) {
    const key = `${dateOnly(row.fecha_hora)}-${row.circuito_id}`;
    const current = groups.get(key) || {
      ...row,
      fecha_hora: `${dateOnly(row.fecha_hora)}T12:00:00-05:00`,
      promedio_voltaje: [],
      promedio_corriente: [],
      promedio_potencia: [],
      promedio_factor_potencia: [],
      consumo_energia: 0,
      hasEnergy: false,
    };
    for (const field of [
      "promedio_voltaje",
      "promedio_corriente",
      "promedio_potencia",
      "promedio_factor_potencia",
    ])
      if (
        row[field] !== null &&
        row[field] !== undefined &&
        Number.isFinite(Number(row[field]))
      )
        current[field].push(Number(row[field]));
    if (
      row.consumo_energia !== null &&
      row.consumo_energia !== undefined &&
      Number.isFinite(Number(row.consumo_energia))
    ) {
      current.consumo_energia += Number(row.consumo_energia);
      current.hasEnergy = true;
    }
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((row) => {
      for (const field of [
        "promedio_voltaje",
        "promedio_corriente",
        "promedio_potencia",
        "promedio_factor_potencia",
      ])
        row[field] = row[field].length
          ? row[field].reduce((sum, value) => sum + value, 0) /
            row[field].length
          : null;
      if (!row.hasEnergy) row.consumo_energia = null;
      delete row.hasEnergy;
      return row;
    })
    .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
});
function dateOnly(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date(value));
}
function formatHour(value) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(new Date(value));
}
function formatDay(value) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}
function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}
function display(value, unit) {
  return value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : `${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 3 })} ${unit}`;
}
function rangeValue(value, end = false) {
  return value ? `${value}T${end ? "23:59:59.999" : "00:00:00"}-05:00` : null;
}
function aggregateHourly(rows, panelName, circuitName) {
  const groups = new Map();
  for (const row of rows) {
    const current = groups.get(row.fecha_hora) || {
      ...row,
      circuito_id: `${panelName}-${circuitName}`,
      panel_nombre: panelName,
      circuito_nombre: circuitName,
      promedio_voltaje: [],
      promedio_corriente: [],
      promedio_potencia: [],
      promedio_factor_potencia: [],
      consumo_energia: 0,
      hasEnergy: false,
    };
    for (const field of [
      "promedio_voltaje",
      "promedio_corriente",
      "promedio_potencia",
      "promedio_factor_potencia",
    ])
      if (
        row[field] !== null &&
        row[field] !== undefined &&
        Number.isFinite(Number(row[field]))
      )
        current[field].push(Number(row[field]));
    if (
      row.consumo_energia !== null &&
      row.consumo_energia !== undefined &&
      Number.isFinite(Number(row.consumo_energia))
    ) {
      current.consumo_energia += Number(row.consumo_energia);
      current.hasEnergy = true;
    }
    groups.set(row.fecha_hora, current);
  }
  return [...groups.values()]
    .map((row) => {
      for (const field of [
        "promedio_voltaje",
        "promedio_corriente",
        "promedio_potencia",
        "promedio_factor_potencia",
      ])
        row[field] = row[field].length
          ? row[field].reduce((sum, value) => sum + value, 0) /
            row[field].length
          : null;
      if (!row.hasEnergy) row.consumo_energia = null;
      delete row.hasEnergy;
      return row;
    })
    .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
}
async function loadStructure() {
  if (!predio.predioId.value) return;
  loadingStructure.value = true;
  loadError.value = "";
  try {
    const allPanels = orderPanels(
      await tiempoRealApi.listarPaneles(predio.predioId.value),
    );
    const eligiblePanels = [];
    const eligibleMainPanels = [];
    const next = [];
    for (const panel of allPanels) {
      const devices = (await tiempoRealApi.listarDispositivos(panel.id)).filter(
        (device) => device.uuid_esp32,
      );
      if (!devices.length) continue;
      eligiblePanels.push(panel);
      if (panel.tipo_panel === "Principal") eligibleMainPanels.push(panel);
      for (const device of devices) {
        const circuits = await tiempoRealApi.listarCircuitos(device.id);
        for (const circuit of circuits || [])
          next.push({ panel, device, circuit });
      }
    }
    panels.value = allPanels;
    panelsWithDevices.value = orderPanels(eligiblePanels);
    mainPanels.value = orderPanels(eligibleMainPanels);
    records.value = next;
    selectedPanelId.value = panelsWithDevices.value[0]?.id || "";
    selectedCircuitId.value = COMBINED_CIRCUITS;
  } catch (error) {
    loadError.value =
      error.message || "No se pudo cargar la estructura del predio.";
  } finally {
    loadingStructure.value = false;
  }
}
async function loadHistory() {
  if (
    !predio.predioId.value ||
    !selectedPanelId.value ||
    !fromDate.value ||
    !toDate.value
  )
    return;
  loadingHistory.value = true;
  historyError.value = "";
  try {
    const options = {
      from: rangeValue(fromDate.value),
      to: rangeValue(toDate.value, true),
    };
    if (selectedPanelId.value === COMBINED_PANELS) {
      const responses = await Promise.all(
        mainPanels.value.map((panel) =>
          tiempoRealApi.historial(predio.predioId.value, {
            ...options,
            panelId: panel.id,
          }),
        ),
      );
      historyRows.value = aggregateHourly(
        responses.flat(),
        "Paneles Juntos",
        "Circuitos Juntos",
      );
    } else if (selectedCircuitId.value === COMBINED_CIRCUITS) {
      const rows = await tiempoRealApi.historial(predio.predioId.value, {
        ...options,
        panelId: selectedPanelId.value,
      });
      historyRows.value = aggregateHourly(
        rows,
        panels.value.find(
          (panel) => String(panel.id) === String(selectedPanelId.value),
        )?.nombre || "Panel",
        "Circuitos Juntos",
      );
    } else {
      historyRows.value = await tiempoRealApi.historial(predio.predioId.value, {
        ...options,
        panelId: selectedPanelId.value,
        circuitId: selectedCircuitId.value,
      });
    }
  } catch (error) {
    historyError.value = error.message || "No se pudo cargar el historial.";
    historyRows.value = [];
  } finally {
    loadingHistory.value = false;
  }
}
async function loadAll() {
  await loadStructure();
  await loadHistory();
}
function setDefaultDates() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400000);
  fromDate.value = dateOnly(start);
  toDate.value = dateOnly(end);
  tableMode.value = "hour";
}
watch(
  () => predio.predioId.value,
  async (value) => {
    if (value) {
      setDefaultDates();
      await loadAll();
    }
  },
);
watch(selectedPanelId, () => {
  selectedCircuitId.value = COMBINED_CIRCUITS;
  if (selectedPanelId.value) loadHistory();
});
watch(selectedCircuitId, () => {
  if (selectedPanelId.value) loadHistory();
});
onMounted(async () => {
  if (!fromDate.value) setDefaultDates();
  if (predio.predioId.value) await loadAll();
});
</script>

<style scoped>
.history-view {
  display: grid;
  gap: 18px;
  max-width: 1320px;
  margin: 0 auto;
}
.welcome {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
}
.welcome h2 {
  margin: 6px 0;
  font-size: clamp(25px, 4vw, 36px);
}
.welcome p {
  color: #fff;
  font-size: 14px;
}
.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}
.filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
  padding: 16px;
}
.table-filters {
  display: grid;
  grid-template-columns: 1fr 220px;
  align-items: end;
  gap: 12px;
  padding: 16px;
}
.table-filters h3 {
  margin-top: 5px;
  color: #e6f0fc;
  font-size: 18px;
}
.table-card {
  padding: 6px;
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  color: #fff;
  font-size: 13px;
}
th,
td {
  padding: 12px 13px;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
  white-space: nowrap;
}
th {
  color: #b8d8ff;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #162336;
  position: sticky;
  top: 0;
}
td {
  color: #f4f7ff;
}
tbody tr:hover {
  background: rgba(113, 173, 255, 0.08);
}
.empty-row {
  text-align: center;
  padding: 28px;
  color: #fff;
}
.field {
  display: grid;
  gap: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.field input,
.field select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #30445d;
  border-radius: var(--radius-sm);
  background: #152236;
  color: var(--color-ink);
}
.field input:focus,
.field select:focus {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary-soft);
}
@media (max-width: 900px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .table-filters {
    grid-template-columns: 1fr 1fr;
  }
  .table-filters > div {
    grid-column: 1/-1;
  }
}
@media (max-width: 560px) {
  .filters,
  .table-filters {
    grid-template-columns: 1fr;
  }
  .table-filters > div {
    grid-column: auto;
  }
}
</style>
