const service = require("./auth.service");
const repository = require("./auth.repository");

const register = async (req, res, next) => {
  try {
    res.status(201).json(await service.register(req.body));
  } catch (e) {
    next(e);
  }
};
const login = async (req, res, next) => {
  try {
    res.json(await service.login(req.body));
  } catch (e) {
    next(e);
  }
};
const me = async (req, res, next) => {
  try {
    const user = await repository.findById(req.usuario.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

module.exports = { register, login, me };
