const registros = new Map(); // clave "nombreRuta:ip" -> { intentos, expiraEn }

function limpiarRegistrosVencidos() {
  const ahora = Date.now();
  for (const [clave, registro] of registros) {
    if (ahora >= registro.expiraEn) registros.delete(clave);
  }
}

/**
 * Crea un middleware que limita cuantas veces una misma IP puede llamar
 * a la ruta donde se lo use, dentro de una ventana de tiempo.
 *
 * @param {object} opciones
 * @param {number} opciones.maximoIntentos - intentos permitidos por ventana.
 * @param {number} opciones.ventanaMs - duracion de la ventana, en ms.
 * @param {string} opciones.nombreRuta - identificador unico de la ruta,
 *        para no mezclar el conteo de dos rutas distintas que usen este
 *        mismo middleware con distinta configuracion (ej. "login" vs
 *        "registrar-dispositivo").
 */
function crearLimitadorDeIntentos({ maximoIntentos, ventanaMs, nombreRuta }) {
  if (!nombreRuta) {
    throw new Error("crearLimitadorDeIntentos requiere 'nombreRuta'");
  }

  return function limitador(req, res, next) {
    limpiarRegistrosVencidos();

    const clave = `${nombreRuta}:${req.ip}`;
    const ahora = Date.now();
    let registro = registros.get(clave);

    if (!registro || ahora >= registro.expiraEn) {
      registro = { intentos: 0, expiraEn: ahora + ventanaMs };
      registros.set(clave, registro);
    }

    registro.intentos += 1;

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

module.exports = { crearLimitadorDeIntentos };
