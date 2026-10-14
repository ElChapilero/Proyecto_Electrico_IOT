const service = require("./circuitos.service");  // Lógica de circuitos

// maneja respuestas y errores.
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
  // Lista los circuitos de un dispositivo.
  list: wrap((req) => service.list(req.params.dispositivoId, req.usuario.id)),

  // Crea un circuito para el dispositivo.
  create: async (req, res, next) => {
    try {
      res
        .status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200)
        .json(
          await service.create(
            req.params.dispositivoId,
            req.usuario.id,
            req.body,
          ),
        );
    } catch (e) {
      next(e);
    }
  },

  // Consulta un circuito por ID.
  get: wrap((req) => service.get(req.params.circuitoId, req.usuario.id)),

  // Actualiza un circuito.
  update: wrap((req) =>
    service.update(req.params.circuitoId, req.usuario.id, req.body),
  ),

  // Elimina un circuito.
  remove: wrap(async (req) => {
    await service.remove(req.params.circuitoId, req.usuario.id);
  }),
};
