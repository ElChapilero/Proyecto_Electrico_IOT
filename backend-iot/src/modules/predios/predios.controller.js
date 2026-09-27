const service = require("./predios.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req);
    if (data === undefined) return res.status(204).send();
    res.json(data);
  } catch (e) {
    next(e);
  }
};
module.exports = {
  list: wrap((req) => service.list(req.usuario.id)),
  get: wrap((req) => service.get(req.params.predioId, req.usuario.id)),
  create: async (req, res, next) => {
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.create(req.usuario.id, req.body)); } catch (e) { next(e); }
  },
  update: wrap((req) =>
    service.update(req.params.predioId, req.usuario.id, req.body),
  ),
  remove: wrap(async (req) => {
    await service.remove(req.params.predioId, req.usuario.id);
  }),
};
