const service = require("./paneles.service");
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
  list: wrap((req) => service.list(req.params.predioId, req.usuario.id)),
  create: async (req, res, next) => {
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.create(req.usuario.id, { ...req.body, id_predio: req.params.predioId })); } catch (e) { next(e); }
  },
  get: wrap((req) => service.get(req.params.panelId, req.usuario.id)),
  update: wrap((req) =>
    service.update(req.params.panelId, req.usuario.id, req.body),
  ),
  remove: wrap(async (req) => {
    await service.remove(req.params.panelId, req.usuario.id);
  }),
};
