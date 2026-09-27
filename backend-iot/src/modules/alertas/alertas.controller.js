const service = require("./alertas.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    if (result === undefined) return res.status(204).send();
    res.json(result);
  } catch (e) {
    next(e);
  }
};
module.exports = {
  list: wrap((req) => service.list(req.usuario.id)),
  listConfig: wrap((req) =>
    service.listConfig(req.params.predioId, req.usuario.id),
  ),
  createConfig: async (req, res, next) => {
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.createConfig(req.params.predioId, req.usuario.id, req.body)); } catch (e) { next(e); }
  },
  updateConfig: wrap((req) =>
    service.updateConfig(req.params.configuracionId, req.usuario.id, req.body),
  ),
  removeConfig: wrap(async (req) => {
    await service.removeConfig(req.params.configuracionId, req.usuario.id);
  }),
};
