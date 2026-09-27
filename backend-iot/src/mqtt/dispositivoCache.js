// Cache en memoria para relacionar cada ESP32 con su predio y circuitos.

// mqttListener.js lo usa para evitar consultar la base de datos en cada
// mensaje MQTT. Está separado para que dispositivos.service.js y
// circuitos.service.js puedan actualizar o invalidar el cache cuando
// hagan cambios.

// (Fix bug importante 3.1)
// El cache se invalida cuando cambia el dispositivo o sus circuitos.
// Así mqttListener.js no usa información vieja hasta reiniciar el backend.
const pool = require('../config/db');

const cache = new Map();

async function obtenerInfoDispositivo(uuidEsp32) {
  const infoCacheada = cache.get(uuidEsp32);
  if (infoCacheada) return infoCacheada;

  const filas = await pool.query(
    `SELECT p.id_predio, c.id AS id_circuito, c.indice
     FROM dispositivos d
     JOIN paneles_electricos p ON p.id = d.id_panel
     LEFT JOIN circuitos c ON c.id_dispositivo = d.id
     WHERE d.uuid_esp32 = $1`,
    [uuidEsp32],
  );

  if (filas.rows.length === 0) return null; // dispositivo no registrado

  const porIndice = {};
  filas.rows.forEach((fila) => {
    if (fila.id_circuito) {
      porIndice[fila.indice] = fila.id_circuito;
    }
  });

  const info = { idPredio: filas.rows[0].id_predio, porIndice };
  cache.set(uuidEsp32, info);
  return info;
}

// Invalidar el cache después de confirmar en la BD cualquier cambio que
// afecte la información del dispositivo: moverlo, borrarlo o agregar/eliminar
// circuitos. No hace falta al cambiar nombres o el estado del circuito,
// porque esos datos no se guardan en el cache.
function invalidar(uuidEsp32) {
  if (uuidEsp32) cache.delete(uuidEsp32);
}

module.exports = { obtenerInfoDispositivo, invalidar };
