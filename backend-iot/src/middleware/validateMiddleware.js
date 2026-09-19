function validar(validator) {
  return (req, res, next) => {
    const resultado = validator(req);
    if (resultado !== true) return res.status(400).json({ error: resultado });
    next();
  };
}

module.exports = { validar };
