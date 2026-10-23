const service = require("./circuitos.service");  // Lógica de circuitos
const { emitirEstructuraActualizada } = require("../../realtime/realtime.service");

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
  update: async (req, res, next) => {
    try { const result = await service.update(req.params.circuitoId, req.usuario.id, req.body); emitirEstructuraActualizada(req.app.get("io"), result.predioId); res.json(result); } catch (e) { next(e); }
  },

  // Elimina un circuito.
  remove: wrap(async (req) => {
    const result = await service.remove(req.params.circuitoId, req.usuario.id);
    emitirEstructuraActualizada(req.app.get("io"), result.predioId);
  }),
};
