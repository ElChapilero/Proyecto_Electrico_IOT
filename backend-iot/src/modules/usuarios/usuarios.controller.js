const service = require("./usuarios.service");
const wrap = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    next(e);
  }
};
module.exports = {
  getMe: wrap((req) => service.getMe(req.usuario.id)),
  updateMe: wrap((req) => service.updateMe(req.usuario.id, req.body)),
};
