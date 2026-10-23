const service = require("./dispositivos.service"); // lógica de dispositivos
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
  // Lista los dispositivos de un panel.
  list: wrap((req) => service.list(req.params.panelId, req.usuario.id)),

  // Consulta un dispositivo.
  get: wrap((req) => service.get(req.params.dispositivoId, req.usuario.id)),

  // Crea un dispositivo
  create: async (req, res, next) => {
    try {
      const result = await service.create(req.params.panelId, req.usuario.id, req.body);
      res.status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200).json(result);
    } catch (e) {
      next(e);
    }
  },

  // Actualiza un dispositivo.
  update: async (req, res, next) => {
    try { const result = await service.update(req.params.dispositivoId, req.usuario.id, req.body); emitirEstructuraActualizada(req.app.get("io"), result.id_predio); res.json(result); } catch (e) { next(e); }
  },

  // Elimina un dispositivo.
  remove: wrap(async (req) => {
    const result = await service.remove(req.params.dispositivoId, req.usuario.id);
    emitirEstructuraActualizada(req.app.get("io"), result.id_predio);
  }),

  // Genera un código para vincular un dispositivo.
  generateCode: wrap((req) =>
    service.generateCode(req.body?.panelId, req.usuario.id),
  ),

  // Registra el ESP32 usando los datos enviados por el dispositivo.
  register: async (req, res, next) => {
    // El firmware existente espera v1 usa 201.
    try {
      const result = await service.register(req.body);
      res.status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200).json(result);
      emitirEstructuraActualizada(req.app.get("io"), result.id_predio);
    } catch (e) {
      next(e);
    }
  },
};
