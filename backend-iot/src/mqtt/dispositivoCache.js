// Guarda en memoria la relación entre cada ESP32, su predio y sus circuitos.

// mqttListener.js usa esta caché para evitar consultas repetidas.
// Los servicios de dispositivos y circuitos pueden invalidarla al hacer cambios.
// Así se evita utilizar información desactualizada.
const pool = require("../config/db");

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

  if (filas.rows.length === 0) return null; // Dispositivo no registrado.

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

// Invalida la caché cuando cambian el dispositivo o sus circuitos.
// No hace falta invalidarla por nombres o estados, porque no se almacenan aquí.
function invalidar(uuidEsp32) {
  if (uuidEsp32) cache.delete(uuidEsp32);
}

module.exports = { obtenerInfoDispositivo, invalidar };
