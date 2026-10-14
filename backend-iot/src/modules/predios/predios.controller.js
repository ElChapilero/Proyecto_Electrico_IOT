const service = require("./predios.service"); // Importa la lógica para gestionar los predios

// devuelve su resultado y gestiona los errores
const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req); // Ejecuta la función y espera su resultado
    if (data === undefined) return res.status(204).send();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  // Obtiene la lista de predios del usuario autenticado
  list: wrap((req) => service.list(req.usuario.id)),

  get: wrap((req) => service.get(req.params.predioId, req.usuario.id)),

  // Crea un predio nuevo
  create: async (req, res, next) => {
    try {
      res
        .status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200)
        .json(await service.create(req.usuario.id, req.body));
    } catch (e) {
      next(e); // Envía el error al middleware
    }
  },

  // Actualiza un predio usando su ID
  update: wrap((req) =>
    service.update(req.params.predioId, req.usuario.id, req.body),
  ),

  // Elimina un predio usando su ID
  remove: wrap(async (req) => {
    await service.remove(req.params.predioId, req.usuario.id);
  }),
};
