const service = require("./mediciones.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    next(e);
  }
};
module.exports = {
  actual: wrap((req) => service.actual(req.params.circuitoId, req.usuario.id)),
  list: wrap((req) =>
    service.list(req.params.circuitoId, req.usuario.id, req.query),
  ),
};
