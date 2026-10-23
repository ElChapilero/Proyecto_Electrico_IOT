const service = require("./paneles.service"); // logica del panel
const { emitirEstructuraActualizada } = require("../../realtime/realtime.service");

// manejo de respuestas y errores en cada controlador.
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
  // Lista los paneles de un predio.
  list: wrap((req) => service.list(req.params.predioId, req.usuario.id)),

  // Crea un panel nuevo dentro de un predio.
  create: async (req, res, next) => {

    try {
      // Llama al servicio y se entrega el ID del usuario y los datos del panel.
      const result = await service.create(req.usuario.id, {
        ...req.body,
        id_predio: req.params.predioId,
      });
      res.status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200).json(result);
      emitirEstructuraActualizada(req.app.get("io"), result.id_predio);
    } catch (e) {
      next(e);
    }
  },

  // Consulta un panel específico.
  get: wrap((req) => service.get(req.params.panelId, req.usuario.id)),
  update: async (req, res, next) => {
    try {
      const result = await service.update(req.params.panelId, req.usuario.id, req.body);
      emitirEstructuraActualizada(req.app.get("io"), result.id_predio);
      res.json(result);
    } catch (e) { next(e); }
  },

  // Elimina un panel.
  remove: wrap(async (req) => {
    const result = await service.remove(req.params.panelId, req.usuario.id);
    emitirEstructuraActualizada(req.app.get("io"), result.id_predio);
  }),
};
