const service = require("./accesos.service");
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
  add: async (req, res, next) => {
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.add(req.params.predioId, req.usuario.id, req.body)); } catch (e) { next(e); }
  },
  update: wrap((req) =>
    service.update(
      req.params.predioId,
      req.params.usuarioId,
      req.usuario.id,
      req.body.rol,
    ),
  ),
  remove: wrap(async (req) => {
    await service.remove(
      req.params.predioId,
      req.params.usuarioId,
      req.usuario.id,
    );
  }),
};
