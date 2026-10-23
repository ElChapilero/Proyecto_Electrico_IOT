// Importar Express
const express = require("express"); // Rutas del backend

// Importar el controlador de autenticación
const controller = require("./auth.controller"); // ejecutar la lógica de cada ruta

// Importar el middleware de autenticación
const { requiereAuth } = require("../../middleware/authMiddleware"); // comprobar si el usuario está autenticado

// Importar el middleware de validación
const { validar } = require("../../middleware/validateMiddleware"); // comprobar los datos recibidos

// Importar el limitador de intentos
const { crearLimitadorDeIntentos } = require("../../middleware/rateLimitMiddleware"); // limitar las peticiones por IP

// Importar los validadores de autenticación
const { validateCredentials,validateRegistration} = require("./auth.validator"); // validar los datos de acceso y registro

// Crear el router de autenticación
const router = express.Router(); // agrupar las rutas de este módulo

// Limitar los intentos de registro
const limitarRegistro = crearLimitadorDeIntentos({
  maximoIntentos: 5,
  ventanaMs: 60 * 60 * 1000, // 1 hora
  nombreRuta: "auth-register",
});

// Limitar los intentos de inicio de sesión
const limitarLogin = crearLimitadorDeIntentos({
  maximoIntentos: 10,
  ventanaMs: 15 * 60 * 1000, // 15 minutos
  nombreRuta: "auth-login", // identificar el límite de inicio de sesión
});

// Registrar un usuario
router.post(
  "/register",
  limitarRegistro,
  validar((req) => validateRegistration(req.body)),
  controller.register,
);

// Iniciar sesión
router.post(
  "/login",
  limitarLogin,
  validar((req) => validateCredentials(req.body)),
  controller.login,
);

// Consultar los datos del usuario autenticado
router.get("/me", requiereAuth, controller.me);

module.exports = router; // exportar las rutas para usarlas en otros archivos
