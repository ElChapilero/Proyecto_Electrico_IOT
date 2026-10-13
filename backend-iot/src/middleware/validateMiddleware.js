// validador de datos
function validar(validator) {
  return (req, res, next) => {
    const resultado = validator(req); // comprobar los datos de la petición
    if (resultado !== true) return res.status(400).json({ error: resultado });
    next();
  };
}

// Expresión para comprobar UUID // verificar el formato de un UUID
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validar parámetros UUID de una ruta
function validarUuidParam(nombre) {
  return (req, res, next) => {
    const valor = req.params[nombre]; // obtener el parámetro de la ruta
    if (!UUID_RE.test(String(valor || ""))) { // comprobar si tiene un UUID válido retur
      return res
        .status(400)
        .json({ error: `${nombre} debe ser un UUID válido` });
    }
    next();
  };
}

// Exportar funciones y expresión
module.exports = { validar, validarUuidParam, UUID_RE }; // permitir usarlos en otros archivos
