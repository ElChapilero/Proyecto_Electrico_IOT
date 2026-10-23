const express = require("express");  // Permite crear rutas en Express
const controller = require("./dispositivos.controller"); // Operaciones dispositivos

// Importa los middlewares de autenticación, límite de intentos y validación.
const { requiereAuth } = require("../../middleware/authMiddleware");
const { crearLimitadorDeIntentos } = require("../../middleware/rateLimitMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");

// Rutas públicas y privadas.
const publicRouter = express.Router();
const router = express.Router();

// Limite de intentos
const limitarRegistroDispositivo = crearLimitadorDeIntentos({
  maximoIntentos: 10,
  ventanaMs: 10 * 60 * 1000, // 10 minutos
  nombreRuta: "dispositivo-registrar",
});

// Ruta pública del esp32.
publicRouter.post("/dispositivos/registrar", limitarRegistroDispositivo, controller.register);

router.use(requiereAuth); // Requieren iniciar sesión.

router.post("/dispositivos/generar-codigo", controller.generateCode);
router.get("/paneles/:panelId/dispositivos", controller.list);
router.post("/paneles/:panelId/dispositivos", validarUuidParam("panelId"), controller.create);
router.get("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.get);
router.patch("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.update);
router.delete("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.remove);

module.exports = { publicRouter, router };
