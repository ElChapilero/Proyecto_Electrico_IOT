<template>
  <div class="summary-view">
    <header class="welcome">
      <div><span class="eyebrow">Indicadores históricos</span><h2>Resumen</h2><p>{{ predio.predioActual.value?.nombre || "Selecciona un predio para comenzar" }}</p></div>
    </header>
    <ErrorState v-if="loadError" :message="loadError" retry @retry="loadAll" />
    <LoadingState v-else-if="loading" message="Cargando resumen, filtros y mediciones…" />
    <EmptyState v-else-if="!predio.predioId.value" title="Selecciona un predio" message="Elige un predio en la barra superior para consultar el resumen." />
    <EmptyState v-else-if="!records.length" title="Este predio aún no tiene circuitos" message="Cuando existan circuitos disponibles aparecerán aquí." />
    <template v-else>
      <section class="filters page-card">
        <BaseSelect label="Panel" v-model="selectedPanelId"><option v-for="panel in panels" :key="panel.id" :value="panel.id">{{ panel.nombre }}</option><option :value="COMPARE_PANELS">Comparar paneles</option></BaseSelect>
        <BaseSelect label="Circuito" v-model="selectedCircuitId" :disabled="isComparingPanels"><option v-if="isComparingPanels" value="">Comparación de paneles activa</option><option v-else v-for="record in filteredRecords" :key="record.circuit.id" :value="record.circuit.id">{{ record.circuit.nombre }}</option><option v-if="!isComparingPanels" :value="COMPARE_CIRCUITS">Comparar circuitos</option></BaseSelect>
        <BaseSelect label="Periodo" v-model="period"><option value="day">Día · 24 horas</option><option value="week">Semana · 7 días</option><option value="month">Mes · todos los días</option></BaseSelect>
        <label v-if="period === 'day'" class="field"><span>Día</span><input v-model="selectedDay" type="date" @keydown.stop /></label>
        <label v-else-if="period === 'week'" class="field"><span>Semana</span><input v-model="selectedWeek" type="week" @keydown.stop /></label>
        <label v-else class="field"><span>Mes</span><input v-model="selectedMonth" type="month" @keydown.stop /></label>
        <div class="scope-note"><span>{{ isComparing ? `Comparando ${entityLabel}s` : "Circuito analizado" }}</span><strong>{{ scopeLabel }}</strong></div>
      </section>
      <section v-if="!isComparing && loadingDashboard && !dashboard" class="page-card loading-panel"><LoadingState message="Cargando indicadores…" /></section>
      <section v-else-if="isComparing && loadingComparison && !comparisonRows.length" class="page-card loading-panel"><LoadingState message="Cargando comparación…" /></section>
      <ErrorState v-else-if="isComparing ? comparisonError : dashboardError" :message="isComparing ? comparisonError : dashboardError" retry @retry="loadSelectedData" />
      <section v-else-if="isComparing && !comparisonRows.length" class="page-card comparison-empty"><strong>No hay mediciones para la comparación seleccionada.</strong><span>Prueba con otro día, semana, mes o filtro.</span><button type="button" @click="loadSelectedData">Reintentar consulta</button></section>
      <template v-else-if="isComparing && comparisonRows.length">
        <ConsumptionDistribution :rows="comparisonRows" :entity-label="entityLabel" />
        <section class="metric-sections">
          <ComparisonMetricSection title="Energía" accent="#39FF14" unit="kWh" :rows="comparisonRows" value-key="consumo_energia" :entity-label="entityLabel" :cards="comparisonCards('consumo_energia', 2, 'consumo')" />
          <ComparisonMetricSection title="Potencia" accent="#DFFF00" unit="W" :rows="comparisonRows" value-key="promedio_potencia" :entity-label="entityLabel" :cards="comparisonCards('promedio_potencia', 2, 'promedio')" />
          <ComparisonMetricSection title="Voltaje" accent="#FF3131" unit="V" :rows="comparisonRows" value-key="promedio_voltaje" :entity-label="entityLabel" :cards="comparisonCards('promedio_voltaje', 2, 'promedio')" />
          <ComparisonMetricSection title="Corriente" accent="#7B2CFF" unit="A" :rows="comparisonRows" value-key="promedio_corriente" :entity-label="entityLabel" :cards="comparisonCards('promedio_corriente', 2, 'promedio')" />
          <ComparisonMetricSection title="Factor de potencia" accent="#FF6A00" unit="FP" :rows="comparisonRows" value-key="promedio_factor_potencia" :entity-label="entityLabel" :cards="comparisonCards('promedio_factor_potencia', 3, 'promedio')" />
        </section>
      </template>
      <template v-else-if="!isComparing && dashboard">
        <section class="metric-sections">
          <MetricSection title="Energía" accent="#39FF14" :cards="energyCards" :chart="energyChart" :chart-points="chartPoints('consumo_energia')" :average="null" :period="period" />
          <MetricSection title="Potencia" accent="#DFFF00" :cards="powerCards" :chart="{ title: 'Potencia', unit: 'W' }" :chart-points="chartPoints('promedio_potencia')" :average="number(dashboard.summary.promedio_potencia)" :period="period" />
          <MetricSection title="Voltaje" accent="#FF3131" :cards="voltageCards" :chart="{ title: 'Voltaje', unit: 'V' }" :chart-points="chartPoints('promedio_voltaje')" :average="number(dashboard.summary.promedio_voltaje)" :period="period" />
          <MetricSection title="Corriente" accent="#7B2CFF" :cards="currentCards" :chart="{ title: 'Corriente', unit: 'A' }" :chart-points="chartPoints('promedio_corriente')" :average="number(dashboard.summary.promedio_corriente)" :period="period" />
          <MetricSection title="Factor de potencia" accent="#FF6A00" :cards="factorCards" :chart="{ title: 'Factor de potencia', unit: 'FP' }" :chart-points="chartPoints('promedio_factor_potencia')" :average="number(dashboard.summary.promedio_factor_potencia)" :period="period" />
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BaseSelect from "../components/common/BaseSelect.vue";
import EmptyState from "../components/common/EmptyState.vue";
import ErrorState from "../components/common/ErrorState.vue";
import LoadingState from "../components/common/LoadingState.vue";
import ComparisonMetricSection from "../components/summary/ComparisonMetricSection.vue";
import ConsumptionDistribution from "../components/summary/ConsumptionDistribution.vue";
import MetricSection from "../components/summary/MetricSection.vue";
import { tiempoRealApi } from "../services/tiempoRealApi";
import { usePredioStore } from "../stores/predioStore";

const predio = usePredioStore();
const COMPARE_PANELS = "__compare-panels__";
const COMPARE_CIRCUITS = "__compare-circuits__";
const panels = ref([]); const records = ref([]); const dashboard = ref(null); const comparisonRows = ref([]);
const selectedPanelId = ref(""); const selectedCircuitId = ref(""); const period = ref("day");
const selectedDay = ref(""); const selectedWeek = ref(""); const selectedMonth = ref(""); const loading = ref(false); const loadingDashboard = ref(false); const loadingComparison = ref(false); const loadError = ref(""); const dashboardError = ref(""); const comparisonError = ref("");
const SUMMARY_REFRESH_MS = 2 * 60 * 1000;
let refreshTimer;
const periodInfo = { day: "Día", week: "Semana", month: "Mes" };
const filteredRecords = computed(() => records.value.filter((record) => String(record.panel.id) === String(selectedPanelId.value)));
const selectedRecord = computed(() => records.value.find((record) => String(record.circuit.id) === String(selectedCircuitId.value)));
const comparisonMode = computed(() => selectedPanelId.value === COMPARE_PANELS ? "panels" : selectedCircuitId.value === COMPARE_CIRCUITS ? "circuits" : "single");
const isComparing = computed(() => comparisonMode.value !== "single");
const isComparingPanels = computed(() => comparisonMode.value === "panels");
const entityLabel = computed(() => comparisonMode.value === "panels" ? "panel" : "circuito");
const scopeLabel = computed(() => isComparingPanels.value ? "Todos los paneles" : selectedCircuitId.value === COMPARE_CIRCUITS ? `Circuitos de ${filteredRecords.value[0]?.panel?.nombre || "panel seleccionado"}` : selectedRecord.value?.circuit.nombre || "—");
const color = computed(() => ({ day: "#39FF14", week: "#39FF14", month: "#39FF14" }[period.value]));
const unit = (key) => key === "factor_potencia" ? "FP" : key === "potencia" ? "W" : key === "voltaje" ? "V" : key === "corriente" ? "A" : "kWh";
const number = (value) => value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
function display(value, decimals = 2) { return value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
const energyCards = computed(() => [{ label: "Consumo acumulado", value: display(dashboard.value?.summary?.consumo_acumulado), unit: "kWh" }, { label: "Energía inicial", value: display(dashboard.value?.summary?.energia_inicial), unit: "kWh" }, { label: "Mayor consumo", value: formatPeak(dashboard.value?.summary?.periodo_mayor_consumo), unit: dashboard.value?.summary?.mayor_consumo == null ? "Sin datos" : `${display(dashboard.value.summary.mayor_consumo)} kWh` }]);
const powerCards = computed(() => cardsFor("promedio_potencia", "min_potencia", "max_potencia", "W"));
const voltageCards = computed(() => cardsFor("promedio_voltaje", "min_voltaje", "max_voltaje", "V"));
const currentCards = computed(() => cardsFor("promedio_corriente", "min_corriente", "max_corriente", "A"));
const factorCards = computed(() => cardsFor("promedio_factor_potencia", "min_factor_potencia", "max_factor_potencia", "FP"));
const energyChart = { title: "Consumo de energía", unit: "kWh" };
function cardsFor(avg, min, max, metricUnit) { return [{ label: "Promedio", value: display(dashboard.value?.summary?.[avg], metricUnit === "FP" ? 3 : 2), unit: metricUnit }, { label: "Máximo", value: display(dashboard.value?.summary?.[max], metricUnit === "FP" ? 3 : 2), unit: metricUnit }, { label: "Mínimo", value: display(dashboard.value?.summary?.[min], metricUnit === "FP" ? 3 : 2), unit: metricUnit }]; }
function chartPoints(key) { return (dashboard.value?.series || []).map((item) => ({ time: item.periodo, value: item[key] })).filter((item) => number(item.value) !== null); }
function formatPeak(value) { if (!value) return "—"; const date = new Date(value); return period.value === "day" ? new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).format(date) : new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short" }).format(date); }
function dateString(date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date); }
function isoWeekValue(date) { const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const day = copy.getUTCDay() || 7; copy.setUTCDate(copy.getUTCDate() + 4 - day); const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1)); const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7); return `${copy.getUTCFullYear()}-W${String(week).padStart(2, "0")}`; }
function monthValue(date) { return dateString(date).slice(0, 7); }
function setPeriodDates(nextPeriod) { const now = new Date(); const today = dateString(now); selectedDay.value = today; selectedWeek.value = isoWeekValue(new Date(`${today}T12:00:00`)); selectedMonth.value = today.slice(0, 7); }
function isoStart(value) { return value ? `${value}T00:00:00-05:00` : null; }
function isoEnd(value) { return value ? `${value}T23:59:59.999-05:00` : null; }
function weekRange(value) { const match = /^(\d{4})-W(\d{2})$/.exec(value || ""); if (!match) return { from: null, to: null }; const year = Number(match[1]); const week = Number(match[2]); const jan4 = new Date(Date.UTC(year, 0, 4)); const day = jan4.getUTCDay() || 7; const monday = new Date(jan4); monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7); const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6); return { from: `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`, to: `${sunday.getUTCFullYear()}-${String(sunday.getUTCMonth() + 1).padStart(2, "0")}-${String(sunday.getUTCDate()).padStart(2, "0")}` }; }
function monthRange(value) { const match = /^(\d{4})-(\d{2})$/.exec(value || ""); if (!match) return { from: null, to: null }; const year = Number(match[1]); const month = Number(match[2]); const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); return { from: `${year}-${match[2]}-01`, to: `${year}-${match[2]}-${String(lastDay).padStart(2, "0")}` }; }
function selectedRange() { if (period.value === "day") return { from: isoStart(selectedDay.value), to: isoEnd(selectedDay.value) }; if (period.value === "week") { const range = weekRange(selectedWeek.value); return { from: isoStart(range.from), to: isoEnd(range.to) }; } const range = monthRange(selectedMonth.value); return { from: isoStart(range.from), to: isoEnd(range.to) }; }
async function loadStructure() { if (!predio.predioId.value) return; loading.value = true; loadError.value = ""; try { panels.value = await tiempoRealApi.listarPaneles(predio.predioId.value); const built = []; for (const panel of panels.value || []) { const devices = await tiempoRealApi.listarDispositivos(panel.id); for (const device of devices || []) { const circuits = await tiempoRealApi.listarCircuitos(device.id); for (const circuit of circuits || []) built.push({ panel, device, circuit }); } } records.value = built; if (built.length) { selectedPanelId.value = String(built[0].panel.id); selectedCircuitId.value = String(built[0].circuit.id); } } catch { loadError.value = "No se pudo cargar la estructura del predio."; } finally { loading.value = false; } }
async function loadDashboard({ silent = false } = {}) { if (isComparing.value || !selectedCircuitId.value) return; if (!silent) loadingDashboard.value = true; if (!silent) dashboardError.value = ""; try { dashboard.value = await tiempoRealApi.dashboard(selectedCircuitId.value, { period: period.value, ...selectedRange() }); dashboardError.value = ""; } catch { if (!silent) dashboardError.value = "No se pudo cargar el resumen histórico."; } finally { if (!silent) loadingDashboard.value = false; } }
async function loadComparison({ silent = false } = {}) { if (!isComparing.value || !predio.predioId.value) return; if (!silent) loadingComparison.value = true; if (!silent) comparisonError.value = ""; try { const options = { period: period.value, ...selectedRange() }; comparisonRows.value = comparisonMode.value === "panels" ? await tiempoRealApi.compararPaneles(predio.predioId.value, options) : await tiempoRealApi.compararCircuitos(predio.predioId.value, { ...options, panelId: selectedPanelId.value }); comparisonError.value = ""; } catch { if (!silent) comparisonError.value = "No se pudo cargar la comparación."; } finally { if (!silent) loadingComparison.value = false; } }
function loadSelectedData(options = {}) { return isComparing.value ? loadComparison(options) : loadDashboard(options); }
function refreshDashboard() { if (!loadingDashboard.value && !loadingComparison.value) loadSelectedData({ silent: true }); }
function entityName(row) { return entityLabel.value === "panel" ? row.panel_nombre : row.circuito_nombre || `Circuito ${row.circuito}`; }
function comparisonCards(valueKey, decimals, kind) { const values = comparisonRows.value.filter((row) => row[valueKey] !== null && row[valueKey] !== undefined && Number.isFinite(Number(row[valueKey]))).sort((a, b) => Number(a[valueKey]) - Number(b[valueKey])); if (!values.length) return [{ label: `Mayor ${kind}`, value: "—", entity: "Sin datos" }, { label: `Menor ${kind}`, value: "—", entity: "Sin datos" }]; const min = values[0]; const max = values.at(-1); return [{ label: `Mayor ${kind}`, value: display(max[valueKey], decimals), entity: entityName(max) }, { label: `Menor ${kind}`, value: display(min[valueKey], decimals), entity: entityName(min) }]; }
async function loadAll() { await loadStructure(); await loadSelectedData(); }
watch(selectedPanelId, () => { if (selectedPanelId.value === COMPARE_PANELS) { selectedCircuitId.value = ""; return; } if (selectedCircuitId.value === COMPARE_CIRCUITS) return; const first = filteredRecords.value[0]; if (first) selectedCircuitId.value = String(first.circuit.id); });
watch([selectedCircuitId, selectedPanelId, period, selectedDay, selectedWeek, selectedMonth], loadSelectedData);
watch(period, setPeriodDates);
watch(() => predio.predioId.value, loadAll);
onMounted(() => { setPeriodDates(period.value); loadAll(); refreshTimer = setInterval(refreshDashboard, SUMMARY_REFRESH_MS); });
onBeforeUnmount(() => clearInterval(refreshTimer));
</script>

<style scoped>
.summary-view { display: grid; gap: 20px; min-width: 0; }.welcome { display: flex; align-items: flex-start; }.eyebrow { color: var(--color-primary); font-size: 11px; text-transform: uppercase; letter-spacing: .1em; font-weight: 700; }.welcome h2 { color: #eaf3ff; font-size: 30px; margin-top: 7px; }.welcome p { color: #fff; margin-top: 7px; font-size: 15px; }
.filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(180px, 1.15fr); gap: 14px; padding: 18px; }.scope-note { display: grid; align-content: center; gap: 6px; min-width: 0; padding: 0 14px; border-left: 1px solid rgba(100,133,171,.2); color: #fff; }.scope-note span { font-size: 13px; }.scope-note strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }.loading-panel { padding: 10px; }.comparison-empty { display: grid; gap: 8px; padding: 24px; color: #fff; }.comparison-empty strong { color: #eaf3ff; }.comparison-empty button { justify-self: start; min-height: 38px; padding: 8px 12px; border: 1px solid #45617e; border-radius: var(--radius-sm); background: #1b2d43; color: #fff; font-weight: 700; }.metric-sections { display: grid; gap: 28px; }.metric-block { display: grid; gap: 14px; }.section-heading h3 { color: #e6f0fc; font-size: 21px; margin-top: 6px; }.cards-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }.metric-card { min-height: 108px; padding: 17px 18px; display: grid; align-content: center; gap: 5px; border-top: 3px solid var(--metric-accent); }.metric-card span { color: #fff; font-size: 13px; }.metric-card strong { color: #fff; font-size: 25px; line-height: 1.1; }.metric-card small { color: #fff; font-size: 12px; }
@media (max-width: 1100px) { .filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }.scope-note { grid-column: 1 / -1; border-left: 0; border-top: 1px solid rgba(100,133,171,.2); padding: 12px 0 0; } }
@media (max-width: 650px) { .filters, .cards-row { grid-template-columns: 1fr; }.scope-note { border-left: 0; border-top: 1px solid rgba(100,133,171,.2); padding: 12px 0 0; } }
</style>
