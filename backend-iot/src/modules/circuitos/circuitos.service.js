const repo = require("./circuitos.repository"); // Consultas a la BD

// permisos y obtener datos relacionados.
const {
  predioDeDispositivo,
  predioDeCircuito,
  esAdministrador,
  tieneAcceso,
  uuidEsp32DeDispositivo,
  uuidEsp32DeCircuito,
} = require("../../utils/accesoHelpers");

const dispositivoCache = require("../../mqtt/dispositivoCache");

// Crea errores con el estado HTTP.
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });

// Lista los circuitos
async function list(deviceId, userId) {
  const predio = await predioDeDispositivo(deviceId);

  if (!predio || !(await tieneAcceso(predio, userId)))
    throw error(403, "No tienes acceso al dispositivo");
  return repo.list(deviceId, userId);
}

// Busca un circuito
async function get(id, userId) {
  const c = await repo.find(id);

  if (!c) throw error(404, "Circuito no encontrado");

  const predio = await predioDeCircuito(id);

  if (!predio || !(await tieneAcceso(predio, userId)))
    throw error(403, "No tienes acceso al circuito");
  return c;
}

// Crea un circuito
async function create(deviceId, userId, data) {
  const predio = await predioDeDispositivo(deviceId);

  if (!predio || !(await esAdministrador(predio, userId)))
    throw error(403, "Se requiere ser administrador");

  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.nombre !== "string" || !data.nombre.trim() || !Number.isInteger(data.indice))
    throw error(400, "nombre e indice son obligatorios");

  if (data.indice < 1 || data.indice > 4)
    throw error(400, "indice debe estar entre 1 y 4");

  const creado = await repo.create(deviceId, {
    nombre: data.nombre.trim(),
    indice: data.indice,
  });
  
  dispositivoCache.invalidar(await uuidEsp32DeDispositivo(deviceId));
  return creado;
}

// Actualiza el nombre
async function update(id, userId, data) {
  const current = await repo.find(id);

  if (!current) throw error(404, "Circuito no encontrado");

  const predio = await predioDeCircuito(id);

  if (!predio || !(await esAdministrador(predio, userId)))
    throw error(403, "Se requiere ser administrador");

  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");

  if (data.nombre !== undefined && (typeof data.nombre !== "string" || data.nombre.trim().length < 2))
    throw error(400, "nombre inválido");

  if (data.estado !== undefined && typeof data.estado !== "boolean")
    throw error(400, "estado debe ser booleano");

  if (data.nombre === undefined && data.estado === undefined)
    throw error(400, "No hay campos válidos para actualizar");

  const actualizado = await repo.update(id, data);
  return { ...actualizado, predioId: predio };
}

// Elimina un circuito y limpia la caché MQTT.
async function remove(id, userId) {
  const current = await repo.find(id);

  if (!current) throw error(404, "Circuito no encontrado");

  const predio = await predioDeCircuito(id);

  if (!predio || !(await esAdministrador(predio, userId)))
    throw error(403, "Se requiere ser administrador");

  const uuid = await uuidEsp32DeCircuito(id);

  await repo.remove(id);
  
  dispositivoCache.invalidar(uuid);
  return { predioId: predio };
}

module.exports = { list, get, create, update, remove };
