const service = require("./dispositivos.service");
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
  list: wrap((req) => service.list(req.params.panelId, req.usuario.id)),
  get: wrap((req) => service.get(req.params.dispositivoId, req.usuario.id)),
  create: async (req, res, next) => {
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.create(req.params.panelId, req.usuario.id, req.body)); } catch (e) { next(e); }
  },
  update: wrap((req) =>
    service.update(req.params.dispositivoId, req.usuario.id, req.body),
  ),
  remove: wrap(async (req) => {
    await service.remove(req.params.dispositivoId, req.usuario.id);
  }),
  generateCode: wrap((req) =>
    service.generateCode(req.body?.panelId, req.usuario.id),
  ),
  register: async (req, res, next) => {
    // El firmware existente espera 200 en la ruta antigua; v1 usa 201.
    try { res.status(req.originalUrl.startsWith('/api/v1/') ? 201 : 200).json(await service.register(req.body)); } catch (e) { next(e); }
  },
};
