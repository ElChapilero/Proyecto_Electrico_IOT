const service = require("./usuarios.service"); // Importa las reglas de usuarios

// función para ejecutar su lógica y manejar errores
const wrap = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  // Consulta los datos del usuario autenticado
  getMe: wrap((req) => service.getMe(req.usuario.id)),

  // Actualiza los datos del usuario
  updateMe: wrap((req) => service.updateMe(req.usuario.id, req.body)),

  // Cambia la contraseña del usuario autenticado
  changePassword: wrap((req) => service.changePassword(req.usuario.id, req.body)),
};
