function validar(validator) {
  return (req, res, next) => {
    const resultado = validator(req);
    if (resultado !== true) return res.status(400).json({ error: resultado });
    next();
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validarUuidParam(nombre) {
  return (req, res, next) => {
    const valor = req.params[nombre];
    if (!UUID_RE.test(String(valor || ""))) {
      return res.status(400).json({ error: `${nombre} debe ser un UUID válido` });
    }
    next();
  };
}

module.exports = { validar, validarUuidParam, UUID_RE };
