const repo = require("./predioAnalitica.repository");
const { tieneAcceso } = require("../../utils/accesoHelpers");

const error = (status, message) => Object.assign(new Error(message), { status, publicMessage: message });
const VARIABLES = new Set([
  "energia", "consumo_energia", "potencia", "voltaje", "corriente",
  "frecuencia", "factor_potencia", "cantidad_muestras",
]);
const GRANULARIDADES = new Set(["auto", "raw", "hour", "day", "week", "month"]);

function fecha(valor, campo) {
  if (valor === undefined || valor === "") return null;
  if (typeof valor !== "string" || Number.isNaN(Date.parse(valor))) throw error(400, `${campo} debe ser una fecha ISO 8601 válida`);
  return valor;
}

function rango(query = {}, maxDias = 366) {
  const ahora = new Date();
  const desde = fecha(query.from, "from") || new Date(ahora.getTime() - 7 * 86400000).toISOString();
  const hasta = fecha(query.to, "to") || ahora.toISOString();
  if (new Date(desde) > new Date(hasta)) throw error(400, "from no puede ser posterior a to");
  if (new Date(hasta) - new Date(desde) > maxDias * 86400000) throw error(400, `El rango máximo permitido es de ${maxDias} días`);
  return { from: desde, to: hasta };
}

function ids(query = {}) {
  for (const key of ["circuitId", "deviceId", "panelId"]) {
    if (query[key] !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query[key]))
      throw error(400, `${key} debe ser un UUID válido`);
  }
  return { circuitId: query.circuitId, deviceId: query.deviceId, panelId: query.panelId };
}

function opciones(query = {}) {
  const seleccionadas = query.variables ? query.variables.split(",").map((x) => x.trim()).filter(Boolean) : null;
  if (seleccionadas && (seleccionadas.length === 0 || seleccionadas.some((x) => !VARIABLES.has(x))))
    throw error(400, "variables contiene una variable no permitida");
  const granularity = query.granularity || "auto";
  if (!GRANULARIDADES.has(granularity)) throw error(400, "granularity no válida");
  const limit = query.limit === undefined ? 2000 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw error(400, "limit debe ser un entero entre 1 y 5000");
  return { variables: seleccionadas, granularity, limit };
}

async function autorizar(predioId, userId, query) {
  if (!(await tieneAcceso(predioId, userId))) throw error(403, "No tienes acceso al predio");
  const filtros = ids(query);
  if (!(await repo.existeScope({ predioId, ...filtros }))) throw error(404, "El filtro no pertenece al predio solicitado");
  return filtros;
}

function proyectar(row, variables) {
  if (!variables) return row;
  const resultado = {};
  for (const [clave, valor] of Object.entries(row)) {
    if (["circuito_id", "circuito", "dispositivo_id", "panel_id", "periodo", "fecha_hora", "primera_lectura_at", "ultima_lectura_at", "energia_reset_detectado"].includes(clave) || variables.includes(clave)) resultado[clave] = valor;
  }
  return resultado;
}

function respuesta(data, filtros, meta) {
  return { data, meta: { timezone: "America/Bogota", ...meta }, filters: filtros };
}

async function current(predioId, userId, query) {
  const filtros = await autorizar(predioId, userId, query);
  const data = (await repo.current({ predioId, ...filtros })).map((row) => proyectar(row, null));
  return respuesta(data, filtros, { operation: "current", source: "mediciones", granularity: "raw" });
}

async function period(predioId, userId, query, periodName) {
  const filtros = await autorizar(predioId, userId, query);
  const rangoConsulta = rango(query);
  const data = (await repo.aggregate({ predioId, ...filtros }, rangoConsulta.from, rangoConsulta.to, periodName)).map((row) => proyectar(row, null));
  return respuesta(data, filtros, { operation: periodName, source: "mediciones", granularity: periodName, ...rangoConsulta });
}

async function history(predioId, userId, query) {
  const filtros = await autorizar(predioId, userId, query);
  const rangoConsulta = rango(query);
  const op = opciones(query);
  const dias = (new Date(rangoConsulta.to) - new Date(rangoConsulta.from)) / 86400000;
  const granularity = op.granularity === "auto" ? (dias > 7 ? "hour" : "raw") : op.granularity;
  if (granularity === "raw") {
    const data = (await repo.aggregate({ predioId, ...filtros }, rangoConsulta.from, rangoConsulta.to, "day")).slice(0, op.limit).map((row) => proyectar(row, op.variables));
    return respuesta(data, filtros, { operation: "history", source: "mediciones", granularity: "day", ...rangoConsulta, limit: op.limit });
  }
  if (granularity === "hour") {
    const data = (await repo.historyHourly({ predioId, ...filtros }, rangoConsulta.from, rangoConsulta.to, op.limit)).map((row) => proyectar(row, op.variables));
    return respuesta(data, filtros, { operation: "history", source: "mediciones_horarias", granularity, ...rangoConsulta, limit: op.limit });
  }
  const data = (await repo.aggregate({ predioId, ...filtros }, rangoConsulta.from, rangoConsulta.to, granularity)).slice(0, op.limit).map((row) => proyectar(row, op.variables));
  return respuesta(data, filtros, { operation: "history", source: "mediciones", granularity, ...rangoConsulta, limit: op.limit });
}

async function comparison(predioId, userId, query) {
  const filtros = await autorizar(predioId, userId, query);
  const fromA = fecha(query.fromA, "fromA"); const toA = fecha(query.toA, "toA");
  const fromB = fecha(query.fromB, "fromB"); const toB = fecha(query.toB, "toB");
  if (!fromA || !toA || !fromB || !toB) throw error(400, "fromA, toA, fromB y toB son obligatorios");
  if (new Date(fromA) > new Date(toA) || new Date(fromB) > new Date(toB)) throw error(400, "Cada rango debe tener from anterior a to");
  const [a, b] = await Promise.all([
    repo.aggregate({ predioId, ...filtros }, fromA, toA, "day"),
    repo.aggregate({ predioId, ...filtros }, fromB, toB, "day"),
  ]);
  const resumen = (rows) => ({ consumo_energia: rows.reduce((s, x) => s + Number(x.consumo_energia || 0), 0), promedio_potencia: rows.length ? rows.reduce((s, x) => s + Number(x.promedio_potencia || 0), 0) / rows.length : null, muestras: rows.reduce((s, x) => s + Number(x.cantidad_muestras || 0), 0) });
  const periodoA = resumen(a); const periodoB = resumen(b);
  return respuesta({ periodoA, periodoB, diferencia: { consumo_energia: periodoA.consumo_energia - periodoB.consumo_energia, promedio_potencia: periodoA.promedio_potencia === null || periodoB.promedio_potencia === null ? null : periodoA.promedio_potencia - periodoB.promedio_potencia } }, filtros, { operation: "comparison", source: "mediciones", granularity: "day" });
}

async function statistics(predioId, userId, query) {
  const filtros = await autorizar(predioId, userId, query);
  const rangoConsulta = rango(query);
  return respuesta(await repo.statistics({ predioId, ...filtros }, rangoConsulta.from, rangoConsulta.to), filtros, { operation: "statistics", source: "mediciones", granularity: "raw", ...rangoConsulta });
}

module.exports = { current, period, history, comparison, statistics };
