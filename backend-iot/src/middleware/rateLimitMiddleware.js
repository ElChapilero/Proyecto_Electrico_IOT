// Guardar los intentos por ruta e IP
const registros = new Map(); // clave "nombreRuta:ip" -> { intentos, expiraEn }

// Eliminar registros con el tiempo terminado
function limpiarRegistrosVencidos() {
  const ahora = Date.now();
  for (const [clave, registro] of registros) { // recorrer los registros
    if (ahora >= registro.expiraEn) registros.delete(clave);
  }
}

/**
 * @param {object} opciones
 * @param {number} opciones.maximoIntentos - intentos permitidos.
 * @param {number} opciones.ventanaMs - duracion de la ventana, en ms.
 * @param {string} opciones.nombreRuta - identificador unico de la ruta,
 */

// limitador de intentos
function crearLimitadorDeIntentos({ maximoIntentos, ventanaMs, nombreRuta }) {
  if (!nombreRuta) {
    throw new Error("crearLimitadorDeIntentos requiere 'nombreRuta'");
  }

  return function limitador(req, res, next) {
    limpiarRegistrosVencidos(); // eliminar registros vencidos

    const clave = `${nombreRuta}:${req.ip}`; // identificar la ruta y la IP
    const ahora = Date.now();
    let registro = registros.get(clave); // buscar los intentos guardados

    if (!registro || ahora >= registro.expiraEn) {
      registro = { intentos: 0, expiraEn: ahora + ventanaMs };
      registros.set(clave, registro);
    }

    registro.intentos += 1;

    // cuando puede volver a intentar
    if (registro.intentos > maximoIntentos) {
      const segundosRestantes = Math.ceil((registro.expiraEn - ahora) / 1000);
      res.set("Retry-After", String(segundosRestantes));
      return res.status(429).json({
        error: `Demasiados intentos. Volvé a intentar en ${segundosRestantes} segundos.`,
      });
    }

    next();
  };
}

module.exports = { crearLimitadorDeIntentos }; // permite usarlo en otros archivos
