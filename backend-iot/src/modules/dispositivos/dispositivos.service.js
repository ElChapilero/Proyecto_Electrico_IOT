const crypto = require("crypto");
const repo = require("./dispositivos.repository");
const {
  predioDePanel,
  predioDeDispositivo,
  esAdministrador,
  tieneAcceso,
} = require("../../utils/accesoHelpers");
const { agregarUsuarioMqtt, eliminarUsuarioMqtt } = require("../../mqtt/mqttAdmin");
const { host, port } = require("../../config/mqtt");
const { esUuidEsp32Valido } = require("../../utils/mqttIdentifiers");
const dispositivoCache = require("../../mqtt/dispositivoCache");
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });
function code6() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}
async function list(panelId, userId) {
  const p = await predioDePanel(panelId);
  if (!p || !(await tieneAcceso(p, userId)))
    throw error(403, "No tienes acceso al panel");
  return repo.listByPanel(panelId, userId);
}
async function get(id, userId) {
  const d = await repo.find(id);
  if (!d) throw error(404, "Dispositivo no encontrado");
  if (!(await tieneAcceso(d.id_predio, userId)))
    throw error(403, "No tienes acceso al dispositivo");
  return d;
}
async function create(panelId, userId, data) {
  const p = await predioDePanel(panelId);
  if (!p || !(await esAdministrador(p, userId)))
    throw error(403, "Se requiere ser administrador");
  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.uuid_esp32 !== "string" || typeof data.nombre !== "string" || !data.nombre.trim())
    throw error(400, "uuid_esp32 y nombre son obligatorios");
  if (!esUuidEsp32Valido(data.uuid_esp32))
    throw error(400, "uuid_esp32 tiene un formato invalido");
  // Cada dispositivo admite hasta 4 sensores PZEM.
  // Validamos el rango para evitar errores de la base de datos.
  const circuitCount = data.circuitos === undefined ? 2 : data.circuitos;
  if (data.circuitos !== undefined && typeof data.circuitos !== "number")
    throw error(400, "circuitos debe ser un número entero entre 1 y 4");
  if (!Number.isInteger(circuitCount) || circuitCount < 1 || circuitCount > 4)
    throw error(400, "circuitos debe ser un numero entero entre 1 y 4");
  return repo.create({
    panelId,
    uuid: data.uuid_esp32,
    nombre: data.nombre.trim(),
    circuitCount,
  });
}
async function update(id, userId, data) {
  const d = await get(id, userId);
  if (!(await esAdministrador(d.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");
  if (data.nombre !== undefined && (typeof data.nombre !== "string" || data.nombre.trim().length < 2))
    throw error(400, "nombre inválido");
  if (data.id_panel !== undefined && typeof data.id_panel !== "string")
    throw error(400, "id_panel inválido");
  if (data.nombre === undefined && data.id_panel === undefined)
    throw error(400, "No hay campos válidos para actualizar");
  if (data.id_panel) {
    const p = await predioDePanel(data.id_panel);
    if (!p || !(await esAdministrador(p, userId)))
      throw error(403, "No administras el panel destino");
  }
  const actualizado = await repo.update(id, data);
  // Si el dispositivo cambia de panel o predio, actualizamos el cache
  // de MQTT para evitar que quede información desactualizada.
  dispositivoCache.invalidar(d.uuid_esp32);
  return actualizado;
}
async function remove(id, userId) {
  const d = await get(id, userId);
  if (!(await esAdministrador(d.id_predio, userId)))
    throw error(403, "Se requiere ser administrador");
  await repo.remove(id);
  // (Fix bug importante 3.1)
  // Si se registra otro dispositivo con el mismo uuid_esp32,
  // no debe heredar los datos del dispositivo anterior.
  dispositivoCache.invalidar(d.uuid_esp32);
}
async function generateCode(panelId, userId) {
  if (typeof panelId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(panelId))
    throw error(400, "panelId debe ser un UUID válido");
  const p = await predioDePanel(panelId);
  if (!p || !(await esAdministrador(p, userId)))
    throw error(403, "Se requiere ser administrador");
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  for (let i = 0; i < 5; i++) {
    try {
      return {
        ...(await repo.createCode(panelId, code6(), expires)),
        minutos_validez: 10,
      };
    } catch (e) {
      if (e.code !== "23505") throw e;
    }
  }
  throw error(500, "No se pudo generar un código único");
}
async function register({ uuid_esp32, codigo } = {}) {
  if (typeof uuid_esp32 !== "string" || typeof codigo !== "string" || !uuid_esp32 || !codigo)
    throw error(400, "uuid_esp32 y codigo son obligatorios");
  if (!esUuidEsp32Valido(uuid_esp32))
    throw error(400, "uuid_esp32 tiene un formato inválido");

  return repo.withUuidLock(uuid_esp32, async () => {
    const c = await repo.code(codigo);
    if (!c) throw error(404, "Código inválido, usado o expirado");

    const existente = await repo.findByUuid(uuid_esp32);
    if (existente) {
      throw error(409, "Este dispositivo ya está vinculado a un panel. Para moverlo, hacelo desde una sesión autenticada.");
    }

    const mqttPassword = crypto.randomBytes(16).toString("hex");
    try {
      await agregarUsuarioMqtt(uuid_esp32, mqttPassword);
    } catch (e) {
      // Puede fallar al actualizar las ACL o recargar Mosquitto.
      // Si pasa, intentamos eliminar lo creado antes de devolver el error.
      await eliminarUsuarioMqtt(uuid_esp32).catch((cleanupError) => {
        console.error("No se pudo limpiar MQTT tras fallar su configuración:", cleanupError.message);
      });
      throw e;
    }

    try {
      const deviceId = await repo.register(c.id, c.id_panel, uuid_esp32);
      return {
        id: deviceId,
        mqtt_username: uuid_esp32,
        mqtt_password: mqttPassword,
        mqtt_broker: host,
        mqtt_port: port,
      };
    } catch (e) {
      // Mosquitto no participa en la transacción SQL.
      // Si SQL rechaza la vinculación, eliminamos el usuario MQTT creado.
      await eliminarUsuarioMqtt(uuid_esp32).catch((cleanupError) => {
        console.error("No se pudo limpiar el usuario MQTT tras fallar la vinculación:", cleanupError.message);
      });
      if (e.code === "23505") {
        throw error(409, "Este dispositivo ya está vinculado a un panel. Para moverlo, hacelo desde una sesión autenticada.");
      }
      if (e.code === "VINCULATION_CODE_INVALID") throw error(404, e.message);
      throw e;
    }
  });
}
module.exports = { list, get, create, update, remove, generateCode, register };
