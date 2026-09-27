const repo = require("./alertas.repository");
const {
  predioDeCircuito,
  tieneAcceso,
  esAdministrador,
} = require("../../utils/accesoHelpers");
const { emitirAlertaGenerada } = require("../../realtime/realtime.service");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
const variables = [
  "potencia",
  "energia",
  "voltaje",
  "corriente",
  "frecuencia",
  "factor_potencia",
];
const condiciones = ["MAYOR", "MENOR", "IGUAL", "FUERA_RANGO"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function list(userId) {
  return repo.list(userId);
}
async function listConfig(predioId, userId) {
  if (!(await tieneAcceso(predioId, userId)))
    throw error(403, "No tienes acceso al predio");
  return repo.listConfig(predioId);
}
function validate(data) {
  if (
    !data?.nombre ||
    !data?.tipo_variable ||
    !data?.condicion ||
    !variables.includes(data.tipo_variable) ||
    !condiciones.includes(data.condicion) || typeof data.nombre !== "string" || data.nombre.trim().length < 2
  )
    throw error(400, "Configuración de alerta inválida");
  if (data.limite_minimo !== undefined && (typeof data.limite_minimo !== "number" || !Number.isFinite(data.limite_minimo)))
    throw error(400, "limite_minimo debe ser numérico");
  if (data.limite_maximo !== undefined && (typeof data.limite_maximo !== "number" || !Number.isFinite(data.limite_maximo)))
    throw error(400, "limite_maximo debe ser numérico");
  if (
    data.limite_minimo === undefined ||
    (data.condicion === "FUERA_RANGO" && data.limite_maximo === undefined)
  )
    throw error(400, "Faltan límites de la alerta");
  if (data.condicion === "FUERA_RANGO" && data.limite_minimo >= data.limite_maximo)
    throw error(400, "limite_minimo debe ser menor que limite_maximo");
}
async function createConfig(predioId, userId, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.id_circuito !== "string" || !UUID_RE.test(data.id_circuito))
    throw error(400, "id_circuito es obligatorio");
  validate(data);
  if (!(await esAdministrador(predioId, userId)))
    throw error(403, "Se requiere ser administrador");
  const circuitProperty = await predioDeCircuito(data.id_circuito);
  if (circuitProperty !== predioId)
    throw error(400, "El circuito no pertenece al predio");
  return repo.createConfig(data);
}
async function updateConfig(id, userId, data) {
  const current = await repo.findConfig(id);
  if (!current) throw error(404, "Configuración no encontrada");
  if (!(await esAdministrador(current.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");
  if (data.nombre !== undefined && (typeof data.nombre !== "string" || data.nombre.trim().length < 2))
    throw error(400, "nombre inválido");
  if (data.activa !== undefined && typeof data.activa !== "boolean")
    throw error(400, "activa debe ser booleana");
  validate({
    ...current,
    ...data,
    limite_minimo: data.limite_minimo === undefined ? Number(current.limite_minimo) : data.limite_minimo,
    limite_maximo: data.limite_maximo === undefined && current.limite_maximo !== null ? Number(current.limite_maximo) : data.limite_maximo,
  });
  return repo.updateConfig(id, data);
}
async function removeConfig(id, userId) {
  const current = await repo.findConfig(id);
  if (!current) throw error(404, "Configuración no encontrada");
  if (!(await esAdministrador(current.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  await repo.removeConfig(id);
}
function evaluarAlerta(config, value) {
  if (!config.activa) return false;
  if (config.condicion === "MAYOR") return value > config.limite_minimo;
  if (config.condicion === "MENOR") return value < config.limite_minimo;
  if (config.condicion === "IGUAL") return value === config.limite_minimo;
  return value < config.limite_minimo || value > config.limite_maximo;
}

// Cuanto tiempo esperar antes de volver a registrar una alerta para la
// MISMA configuracion mientras la condicion sigue violada. Las
// mediciones llegan cada ~5 segundos: sin este cooldown, un circuito
// que se queda por encima de un limite durante una hora generaria
// cientos de filas casi idénticas en "alertas". Con el cooldown, se
// registra la primera vez que se detecta la violacion y, si sigue
// violada, recien se vuelve a registrar despues de esta ventana.
const COOLDOWN_ALERTA_MS = 5 * 60 * 1000; // 5 minutos
const ultimaAlertaPorConfig = new Map(); // id_configuracion_alerta -> timestamp

// Se llama desde mqttListener.js justo despues de guardar una medicion
// valida. Antes, evaluarAlerta() estaba escrita pero nadie la llamaba
// desde ningun lado: se podian crear configuraciones de alerta desde la
// API, pero ninguna alerta real se generaba nunca, sin importar cuanto
// se excediera un limite (bug critico 1.1). Esta funcion nunca lanza:
// un problema evaluando o guardando una alerta no debe hacer que se
// pierda o se descarte la medicion que SI se guardo correctamente.
async function evaluarYRegistrarAlertas(idCircuito, medidor, idMedicion, io, idPredio) {
  try {
    const configuraciones = await repo.activeConfigsByCircuito(idCircuito);
    if (configuraciones.length === 0) return;

    const ahora = Date.now();

    for (const config of configuraciones) {
      const valor = medidor[config.tipo_variable];
      if (valor === undefined || valor === null) continue; // esta medicion no trae esa variable

      if (!evaluarAlerta(config, valor)) continue; // no se violo el limite

      const ultimaVez = ultimaAlertaPorConfig.get(config.id) || 0;
      if (ahora - ultimaVez < COOLDOWN_ALERTA_MS) continue; // en cooldown, no se repite

      const alerta = await repo.crearAlerta({
        idConfiguracionAlerta: config.id,
        idMedicion,
        tipoVariable: config.tipo_variable,
        valor,
        limiteMinimo: config.limite_minimo,
        limiteMaximo: config.limite_maximo,
      });

      ultimaAlertaPorConfig.set(config.id, ahora);
      emitirAlertaGenerada(io, idPredio, alerta);
    }
  } catch (e) {
    console.error(`❌ Error evaluando alertas del circuito ${idCircuito}:`, e.message);
  }
}

module.exports = {
  list,
  listConfig,
  createConfig,
  updateConfig,
  removeConfig,
  evaluarAlerta,
  evaluarYRegistrarAlertas,
};
