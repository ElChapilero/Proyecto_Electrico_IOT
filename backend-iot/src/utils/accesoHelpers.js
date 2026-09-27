// Funciones compartidas para chequear permisos vía accesos_predio.
// No es un router - lo requieren predios/paneles/dispositivos/
// circuitos.routes.js para no repetir esta logica en cada archivo.

const pool = require('../config/db');

// Rol del usuario sobre un predio, o null si no tiene acceso.
async function obtenerRol(idPredio, idUsuario) {
  const fila = await pool.query(
    'SELECT rol FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2',
    [idPredio, idUsuario]
  );
  return fila.rows[0]?.rol || null;
}

// true si el usuario puede administrar (crear/renombrar/mover/
// borrar/compartir) ese predio.
async function esAdministrador(idPredio, idUsuario) {
  return (await obtenerRol(idPredio, idUsuario)) === 'administrador';
}

// true si el usuario puede al menos VER ese predio (administrador
// o lector).
async function tieneAcceso(idPredio, idUsuario) {
  return (await obtenerRol(idPredio, idUsuario)) !== null;
}

// Dado un id_panel (Principal o Secundario, da igual), su id_predio.
async function predioDePanel(idPanel) {
  const fila = await pool.query('SELECT id_predio FROM paneles_electricos WHERE id = $1', [idPanel]);
  return fila.rows[0]?.id_predio || null;
}

// Dado un id_dispositivo, su id_predio (via su panel).
async function predioDeDispositivo(idDispositivo) {
  const fila = await pool.query(
    `SELECT pa.id_predio
     FROM dispositivos d
     JOIN paneles_electricos pa ON pa.id = d.id_panel
     WHERE d.id = $1`,
    [idDispositivo]
  );
  return fila.rows[0]?.id_predio || null;
}

// Dado un id_circuito, su id_predio (via dispositivo -> panel).
async function predioDeCircuito(idCircuito) {
  const fila = await pool.query(
    `SELECT pa.id_predio
     FROM circuitos c
     JOIN dispositivos d ON d.id = c.id_dispositivo
     JOIN paneles_electricos pa ON pa.id = d.id_panel
     WHERE c.id = $1`,
    [idCircuito]
  );
  return fila.rows[0]?.id_predio || null;
}

// Dado un id_dispositivo, su uuid_esp32. Se usa para invalidar el cache
// en memoria de mqttListener.js (ver mqtt/dispositivoCache.js) cuando
// se crea un circuito nuevo para ese dispositivo.
async function uuidEsp32DeDispositivo(idDispositivo) {
  const fila = await pool.query(
    'SELECT uuid_esp32 FROM dispositivos WHERE id = $1',
    [idDispositivo]
  );
  return fila.rows[0]?.uuid_esp32 || null;
}

// Dado un id_circuito, el uuid_esp32 del dispositivo al que pertenece.
// Mismo uso que la anterior, pero para cuando se va a BORRAR el
// circuito: hay que consultarlo ANTES del DELETE (después, el JOIN ya
// no encuentra la fila).
async function uuidEsp32DeCircuito(idCircuito) {
  const fila = await pool.query(
    `SELECT d.uuid_esp32
     FROM circuitos c
     JOIN dispositivos d ON d.id = c.id_dispositivo
     WHERE c.id = $1`,
    [idCircuito]
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
