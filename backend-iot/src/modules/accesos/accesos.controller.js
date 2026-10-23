const service = require("./accesos.service"); // Importa la lógica para gestionar los accesos

// devuelve su resultado y gestiona los errores
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
  // Lista los accesos de un predio para el usuario autenticado
  list: wrap((req) => service.list(req.params.predioId, req.usuario.id)),

  // Añade un usuario a los accesos de un predio
  add: async (req, res, next) => {
    try {
      res
        .status(req.originalUrl.startsWith("/api/v1/") ? 201 : 200)
        .json(await service.add(req.params.predioId, req.usuario.id, req.body));
    } catch (e) {
      next(e);
    }
  },

  // Actualiza el rol de un usuario dentro de un predio
  update: wrap((req) =>
    service.update(
      req.params.predioId,
      req.params.usuarioId,
      req.usuario.id,
      req.body.rol,
    ),
  ),

  // Elimina el acceso de un usuario a un predio
  remove: wrap(async (req) => {
    await service.remove(
      req.params.predioId,
      req.params.usuarioId,
      req.usuario.id,
    );
  }),
};
