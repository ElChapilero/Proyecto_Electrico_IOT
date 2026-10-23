// Importar el servicio de autenticación
const service = require("./auth.service");// ejecutar la lógica de registro e inicio de sesión

// Importar el repositorio de usuarios
const repository = require("./auth.repository");

// Controlar el registro de usuarios
const register = async (req, res, next) => {
  try {
    res.status(201).json(await service.register(req.body)); // registrar al usuario y devolver la respuesta
  } catch (e) {
    next(e); // enviar el error al middleware de errores
  }
};

// Controlar el inicio de sesión
const login = async (req, res, next) => {
  try {
    res.json(await service.login(req.body)); // iniciar sesión y devolver la respuesta
  } catch (e) {
    next(e);
  }
};

// Obtener los datos del usuario autenticado
const me = async (req, res, next) => {
  try {
    const user = await repository.findById(req.usuario.id); // buscar usuario ID
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" }); 
    res.json(user); // devolver los datos del usuario
  } catch (e) {
    next(e);
  }
};

module.exports = { register, login, me }; // permitir usarlos en las rutas
