// Funciones compartidas para chequear permisos por accesos_predio.
const pool = require("../config/db");

// Rol del usuario sobre un predio.
async function obtenerRol(idPredio, idUsuario) {
  const fila = await pool.query(
    "SELECT rol FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2",
    [idPredio, idUsuario],
  );
  return fila.rows[0]?.rol || null;
}

// true si el usuario puede administrar (crear/renombrar/mover/borrar/compartir) ese predio.
async function esAdministrador(idPredio, idUsuario) {
  return (await obtenerRol(idPredio, idUsuario)) === "administrador";
}

// true si el usuario puede al menos VER ese predio (administrador o lector).
async function tieneAcceso(idPredio, idUsuario) {
  return (await obtenerRol(idPredio, idUsuario)) !== null;
}

// Obtiene el ID del predio al que pertenece un panel.
async function predioDePanel(idPanel) {
  const fila = await pool.query(
    "SELECT id_predio FROM paneles_electricos WHERE id = $1",
    [idPanel],
  );
  return fila.rows[0]?.id_predio || null;
}

// Obtiene el predio al que pertenece un dispositivo.
async function predioDeDispositivo(idDispositivo) {
  const fila = await pool.query(
    `SELECT pa.id_predio
     FROM dispositivos d
     JOIN paneles_electricos pa ON pa.id = d.id_panel
     WHERE d.id = $1`,
    [idDispositivo],
  );
  return fila.rows[0]?.id_predio || null;
}

// Obtiene el predio al que pertenece un circuito.
async function predioDeCircuito(idCircuito) {
  const fila = await pool.query(
    `SELECT pa.id_predio
     FROM circuitos c
     JOIN dispositivos d ON d.id = c.id_dispositivo
     JOIN paneles_electricos pa ON pa.id = d.id_panel
     WHERE c.id = $1`,
    [idCircuito],
  );
  return fila.rows[0]?.id_predio || null;
}

// Obtiene el UUID del ESP32 asociado a un dispositivo.
async function uuidEsp32DeDispositivo(idDispositivo) {
  const fila = await pool.query(
    "SELECT uuid_esp32 FROM dispositivos WHERE id = $1",
    [idDispositivo],
  );
  return fila.rows[0]?.uuid_esp32 || null;
}

// Obtiene el UUID del ESP32 de un circuito antes de eliminarlo.
async function uuidEsp32DeCircuito(idCircuito) {
  const fila = await pool.query(
    `SELECT d.uuid_esp32
     FROM circuitos c
     JOIN dispositivos d ON d.id = c.id_dispositivo
     WHERE c.id = $1`,
    [idCircuito],
  );
  return fila.rows[0]?.uuid_esp32 || null;
}

module.exports = {
  obtenerRol,
  esAdministrador,
  tieneAcceso,
  predioDePanel,
  predioDeDispositivo,
  predioDeCircuito,
  uuidEsp32DeDispositivo,
  uuidEsp32DeCircuito,
};
