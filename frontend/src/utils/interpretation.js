import { parseProjectDate } from "./chartDates";

const metricLabels = {
  energia: { name: "consumo", unit: "kWh", decimals: 4 },
  potencia: { name: "potencia", unit: "W", decimals: 4 },
  voltaje: { name: "voltaje", unit: "V", decimals: 4 },
  corriente: { name: "corriente", unit: "A", decimals: 4 },
  factor_potencia: { name: "factor de potencia", unit: "FP", decimals: 4 },
};

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function format(value, decimals) {
  return Number(value).toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function dateTime(value) {
  const date = parseProjectDate(value);
  if (!Number.isFinite(date.getTime())) return "";
  const dateText = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota",
  }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Bogota",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const timeText = hour === 0
    ? "00:00"
    : new Intl.DateTimeFormat("es-CO", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota",
      }).format(date);
  return `${dateText} a las ${timeText}`;
}

function periodText(period) {
  const value = String(period || "el periodo seleccionado").trim();
  if (/^(24 horas|el día|día)$/i.test(value)) return "Durante 24 horas";
  if (/^(la )?semana$/i.test(value) || /^días de la semana$/i.test(value)) return "Durante la semana";
  if (/^(el )?mes$/i.test(value) || /^días del mes$/i.test(value)) return "Durante el mes";
  if (/^los últimos/i.test(value)) return `Durante ${value}`;
  if (/^durante/i.test(value)) return value[0].toUpperCase() + value.slice(1);
  if (/^en /i.test(value)) return value[0].toUpperCase() + value.slice(1);
  return `Durante ${value}`;
}

function periodUsesDailyAggregation(period, explicit = false) {
  if (explicit) return true;
  const value = String(period || "").trim();
  return /^(días de la semana|días del mes|semana|mes|la semana|el mes)$/i.test(value);
}

function periodMoment(value, period, explicitDailyAggregation = false) {
  const date = parseProjectDate(value);
  if (!Number.isFinite(date.getTime())) return "";
  if (periodUsesDailyAggregation(period, explicitDailyAggregation)) {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Bogota",
    }).format(date);
  }
  return dateTime(value);
}

function articleFor(item, label) {
  const clean = String(label || "circuito").trim();
  const explicit = String(item.article || item.articulo || "").toLowerCase();
  if (["el", "la", "los", "las"].includes(explicit)) return `${explicit} ${clean.toLowerCase()}`;
  if (/^(el|la|los|las)\s/i.test(clean)) return clean.toLowerCase();
  const lower = clean.toLowerCase();
  if (/^(circuitos|paneles)\b/i.test(lower)) return `los ${lower}`;
  if (/^(sala|cocina|oficina|habitación|habitacion|recepción|recepcion|zona|bodega)/i.test(lower)) return `la ${lower}`;
  if (/^(baño|bano|circuito|panel|comedor|laboratorio)/i.test(lower)) return `el ${lower}`;
  const gender = String(item.gender || item.genero || "").toLowerCase();
  if (gender.startsWith("f")) return `la ${lower}`;
  return `el ${lower}`;
}

function sameValue(values) {
  return values.every((value) => Math.abs(value - values[0]) < 0.000001);
}

function normalizedObservations(observations) {
  return observations.map((item) => ({
    ...item,
    value: finite(item.value),
    label: item.label || item.name || item.circuitName || item.panelName || "circuito",
  })).filter((item) => item.value !== null);
}

function realtimeText(observations, meta) {
  const valid = normalizedObservations(observations)
    .filter((item) => Number.isFinite(parseProjectDate(item.time).getTime()))
    .sort((a, b) => parseProjectDate(a.time) - parseProjectDate(b.time));
  if (!valid.length) return "No hay datos disponibles en tiempo real.";
  const latest = valid.at(-1);
  const groups = new Map();
  for (const item of valid) {
    const group = groups.get(item.seriesId || item.label) || [];
    group.push(item);
    groups.set(item.seriesId || item.label, group);
  }
  const trends = [...groups.values()].filter((group) => group.length > 1).map((group) => {
    const first = group[0].value;
    const delta = group.at(-1).value - first;
    const tolerance = Math.max(Math.abs(first) * 0.02, 0.01);
    return delta > tolerance ? "ascendente" : delta < -tolerance ? "descendente" : "estable";
  });
  const unique = [...new Set(trends)];
  const trend = !unique.length
    ? "no hay suficientes lecturas para identificar una tendencia"
    : unique.length === 1
      ? `se observa una tendencia ${unique[0]}`
      : "el comportamiento es variable entre los circuitos";
  return `En la última lectura disponible, ${latest.label} registró ${format(latest.value, meta.decimals)} ${meta.unit}, a las ${dateTime(latest.time)}. En las lecturas recientes, ${trend}.`;
}

export function buildInterpretation({ metricKey, period = "el periodo seleccionado", observations = [], comparison = false, mode = "period", dailyAggregation = false }) {
  const meta = metricLabels[metricKey] || metricLabels.potencia;
  const valid = normalizedObservations(observations);
  if (!valid.length) return "No hay datos disponibles para el periodo seleccionado.";
  if (mode === "realtime") return realtimeText(valid, meta);

  const values = valid.map((item) => item.value);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const max = valid.reduce((best, item) => item.value > best.value ? item : best);
  const min = valid.reduce((best, item) => item.value < best.value ? item : best);

  if (sameValue(values)) {
    if (comparison) return `Durante el periodo evaluado, todos los ${metricKey === "energia" ? "circuitos" : "elementos"} registraron el mismo ${meta.name}: ${format(average, meta.decimals)} ${meta.unit}.`;
    return `${periodText(period)}, el ${meta.name} se mantuvo estable en ${format(average, meta.decimals)} ${meta.unit} en todas las lecturas.`;
  }
  if (comparison) {
    return `Durante el periodo evaluado, el ${meta.name} promedio de los elementos fue de ${format(average, meta.decimals)} ${meta.unit}. El punto más alto se registró en ${articleFor(max, max.label)} (${format(max.value, meta.decimals)} ${meta.unit}), en contraste con ${articleFor(min, min.label)}, que obtuvo el registro más bajo (${format(min.value, meta.decimals)} ${meta.unit}).`;
  }

  const prefix = periodText(period);
  const peakTime = max.time ? ` el ${periodMoment(max.time, period, dailyAggregation)}` : "";
  const end = peakTime ? "." : ".";
  const entity = articleFor(max, max.label);
  if (metricKey === "energia") {
    const aggregation = periodUsesDailyAggregation(period, dailyAggregation) ? "por día" : "por hora";
    return `${prefix}, ${entity} registró un consumo promedio ${aggregation} de ${format(average, meta.decimals)} ${meta.unit}, alcanzando un pico máximo de ${format(max.value, meta.decimals)} ${meta.unit}${peakTime}${end}`;
  }
  if (metricKey === "potencia" || metricKey === "corriente") return `${prefix}, ${entity} registró una ${meta.name} promedio de ${format(average, meta.decimals)} ${meta.unit}, alcanzando un pico máximo de ${format(max.value, meta.decimals)} ${meta.unit}${peakTime}${end}`;
  return `${prefix}, ${entity} registró un ${meta.name} promedio de ${format(average, meta.decimals)} ${meta.unit}, con un valor máximo de ${format(max.value, meta.decimals)} ${meta.unit}${peakTime} y un mínimo de ${format(min.value, meta.decimals)} ${meta.unit}.`;
}

export function metricDefinition(metricKey) {
  return metricLabels[metricKey] || metricLabels.potencia;
}
