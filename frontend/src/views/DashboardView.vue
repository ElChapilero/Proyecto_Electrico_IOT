<template>
  <div class="realtime-view">
    <header class="welcome">
      <div>
        <span class="eyebrow">Monitoreo en vivo</span>
        <h2>Tiempo real</h2>
        <p>
          {{
            predio.predioActual.value?.nombre ||
            "Selecciona un predio para comenzar"
          }}
        </p>
      </div>
    </header>
    <ErrorState v-if="loadError" :message="loadError" retry @retry="loadData" />
    <LoadingState
      v-else-if="loading"
      message="Cargando paneles, circuitos y mediciones…"
    />
    <EmptyState
      v-else-if="!predio.predioId.value"
      title="Selecciona un predio"
      message="Elige un predio en la barra superior para consultar sus mediciones."
    />
    <EmptyState
      v-else-if="!records.length"
      title="Este predio aún no tiene circuitos"
      message="Cuando existan paneles, dispositivos y circuitos disponibles aparecerán aquí."
    />
    <template v-else>
      <RealtimeFilters
        v-model:selected-panel-id="selectedPanelId"
        v-model:selected-circuit-id="selectedCircuitId"
        v-model:range-minutes="rangeMinutes"
        :panels="selectablePanels"
        :disabled-panel-ids="disabledPanelIds"
        :can-compare-panels="canComparePanels"
        :circuit-options="circuitOptions"
        :visible-count="visibleRecords.length"
      />
      <section v-if="!visibleRecords.length" class="page-card inline-empty">
        <strong>No hay circuitos para esta combinación.</strong
        ><span>Prueba con otro panel o circuito.</span>
      </section>
      <template v-else>
        <RealtimeMeasurementGroup
          v-for="record in visibleRecords"
          :key="record.circuit.id"
          :record="record"
          :metrics="metrics"
        />
        <RealtimeCharts
          :charts="charts"
          :series-by-metric="seriesByMetric"
          :range-minutes="rangeMinutes"
        />
      </template>
    </template>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import EmptyState from "../components/common/EmptyState.vue";
import ErrorState from "../components/common/ErrorState.vue";
import LoadingState from "../components/common/LoadingState.vue";
import RealtimeCharts from "../components/realtime/RealtimeCharts.vue";
import RealtimeFilters from "../components/realtime/RealtimeFilters.vue";
import RealtimeMeasurementGroup from "../components/realtime/RealtimeMeasurementGroup.vue";
import {
  realtimeCharts as charts,
  realtimeMetrics as metrics,
  useRealtimeData,
} from "../composables/useRealtimeData";
import { usePredioStore } from "../stores/predioStore";
import { useRealtimeStore } from "../stores/realtimeStore";
const predio = usePredioStore();
const realtime = useRealtimeStore();
const selectedPanelId = ref("all");
const selectedCircuitId = ref("all");
const rangeMinutes = ref(1);
const {
  loading,
  loadError,
  panels,
  panelsWithDevices: panelsWithEsp32,
  records,
  loadData,
  refreshMeasurements,
  applyLivePayload,
  chartSeries,
  invalidate,
} = useRealtimeData(predio.predioId);
const panelsWithDevices = computed(() => panelsWithEsp32.value);
const selectablePanels = computed(() => panels.value);
const disabledPanelIds = computed(
  () =>
    new Set(
      panels.value
        .filter(
          (panel) =>
            !panelsWithDevices.value.some((item) => item.id === panel.id),
        )
        .map((panel) => String(panel.id)),
    ),
);
const canComparePanels = computed(
  () =>
    panelsWithDevices.value.filter((panel) => panel.tipo_panel === "Principal")
      .length > 1,
);
const circuitOptions = computed(() =>
  selectedPanelId.value === "all"
    ? []
    : records.value
        .filter((record) => record.panel.id === selectedPanelId.value)
        .map((record) => ({
          id: record.circuit.id,
          nombre: record.circuit.nombre,
        })),
);
const visibleRecords = computed(() =>
  records.value.filter(
    (record) =>
      (selectedPanelId.value === "all"
        ? record.panel.tipo_panel === "Principal"
        : record.panel.id === selectedPanelId.value) &&
      (selectedCircuitId.value === "all" ||
        record.circuit.id === selectedCircuitId.value),
  ),
);
const seriesByMetric = computed(() =>
  Object.fromEntries(
    metrics.map((metric) => [
      metric.key,
      chartSeries(metric.key, visibleRecords, rangeMinutes),
    ]),
  ),
);
let refreshTimer;
function syncFilters() {
  const validPanels = selectablePanels.value.filter(
    (panel) => !disabledPanelIds.value.has(String(panel.id)),
  );
  const panelIds = new Set(validPanels.map((panel) => String(panel.id)));
  const selectedPanel = String(selectedPanelId.value);
  if (selectedPanel !== "all" && !panelIds.has(selectedPanel)) {
    if (!canComparePanels.value && validPanels.length) {
      selectedPanelId.value = String(validPanels[0].id);
    } else if (canComparePanels.value) {
      selectedPanelId.value = "all";
    }
  } else if (
    selectedPanel === "all" &&
    !canComparePanels.value &&
    validPanels.length
  ) {
    selectedPanelId.value = String(validPanels[0].id);
  }
  const availableCircuits = circuitOptions.value.map((item) => String(item.id));
  if (
    selectedCircuitId.value !== "all" &&
    !availableCircuits.includes(String(selectedCircuitId.value))
  )
    selectedCircuitId.value = "all";
}
watch(
  () => predio.predioId.value,
  () => {
    selectedPanelId.value = "all";
    selectedCircuitId.value = "all";
    loadData();
  },
);
watch([panels, records], syncFilters);
watch(() => realtime.state.ultimaMedicion, applyLivePayload);
watch(selectedPanelId, () => {
  if (
    selectedPanelId.value === "all" ||
    (selectedCircuitId.value !== "all" &&
      !circuitOptions.value.some((item) => item.id === selectedCircuitId.value))
  )
    selectedCircuitId.value = "all";
});
onMounted(() => {
  loadData();
  refreshTimer = setInterval(refreshMeasurements, 5000);
});
onUnmounted(() => {
  clearInterval(refreshTimer);
  invalidate();
});
</script>
<style scoped>
.realtime-view {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.welcome {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.eyebrow {
  color: var(--color-primary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.welcome h2 {
  color: #eaf3ff;
  font-size: 30px;
  margin-top: 7px;
}

.welcome p {
  color: #fff;
  margin-top: 7px;
  font-size: 15px;
}

.inline-empty {
  display: grid;
  gap: 6px;
  padding: 22px;
  color: #fff;
  font-size: 14px;
}

.inline-empty strong {
  color: #fff;
}

@media (max-width: 560px) {
  .welcome {
    display: block;
  }
}
</style>
