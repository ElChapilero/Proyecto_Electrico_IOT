const service = require("./analitica.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    next(e);
  }
};
module.exports = {
  consumo: wrap((req) =>
    service.obtenerConsumoDiario(req.params.circuitoId, req.usuario.id, req.query),
  ),
  estadisticas: wrap((req) =>
    service.obtenerEstadisticas(req.params.circuitoId, req.usuario.id, req.query),
  ),
  comparaciones: wrap((req) =>
    service.compararConSemanaAnterior(req.params.circuitoId, req.usuario.id),
  ),
};
