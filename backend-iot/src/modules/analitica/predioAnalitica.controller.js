const service = require("./predioAnalitica.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  current: wrap((req) =>
    service.current(req.params.predioId, req.usuario.id, req.query),
  ),
  daily: wrap((req) =>
    service.period(req.params.predioId, req.usuario.id, req.query, "day"),
  ),
  weekly: wrap((req) =>
    service.period(req.params.predioId, req.usuario.id, req.query, "week"),
  ),
  monthly: wrap((req) =>
    service.period(req.params.predioId, req.usuario.id, req.query, "month"),
  ),
  history: wrap((req) =>
    service.history(req.params.predioId, req.usuario.id, req.query),
  ),
  statistics: wrap((req) =>
    service.statistics(req.params.predioId, req.usuario.id, req.query),
  ),
  comparePanels: wrap((req) =>
    service.comparePanels(req.params.predioId, req.usuario.id, req.query),
  ),
  compareCircuits: wrap((req) =>
    service.compareCircuits(req.params.predioId, req.usuario.id, req.query),
  ),
};
