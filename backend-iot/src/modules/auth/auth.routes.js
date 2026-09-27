const express = require("express");
const controller = require("./auth.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { validar } = require("../../middleware/validateMiddleware");
const { crearLimitadorDeIntentos } = require("../../middleware/rateLimitMiddleware");
const {
  validateCredentials,
  validateRegistration,
} = require("./auth.validator");

const router = express.Router();

// Mismo limitador para /register y su alias /registro: son la MISMA
// accion, asi que tienen que compartir el conteo de intentos (si cada
// alias tuviera su propio contador, alternar entre los dos duplicaria
// el limite real permitido).
const limitarRegistro = crearLimitadorDeIntentos({
  maximoIntentos: 5,
  ventanaMs: 60 * 60 * 1000, // 1 hora
  nombreRuta: "auth-register",
});
const limitarLogin = crearLimitadorDeIntentos({
  maximoIntentos: 10,
  ventanaMs: 15 * 60 * 1000, // 15 minutos
  nombreRuta: "auth-login",
});

router.post(
  "/register",
  limitarRegistro,
  validar((req) => validateRegistration(req.body)),
  controller.register,
);
router.post(
  "/registro",
  limitarRegistro,
  validar((req) => validateRegistration(req.body)),
  controller.register,
);
router.post(
  "/login",
  limitarLogin,
  validar((req) => validateCredentials(req.body)),
  controller.login,
);
router.get("/me", requiereAuth, controller.me);
module.exports = router;
