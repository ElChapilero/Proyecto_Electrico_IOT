const express = require("express");
const controller = require("./dispositivos.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { crearLimitadorDeIntentos } = require("../../middleware/rateLimitMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");
const publicRouter = express.Router();
const router = express.Router();

// Este endpoint es público porque lo usa el ESP32 para vincularse.
// El código tiene 6 dígitos y dura 10 minutos, así que limitamos
// los intentos por IP para evitar ataques de fuerza bruta.
const limitarRegistroDispositivo = crearLimitadorDeIntentos({
  maximoIntentos: 10,
  ventanaMs: 10 * 60 * 1000, // 10 minutos
  nombreRuta: "dispositivo-registrar",
});

publicRouter.post("/dispositivos/registrar", limitarRegistroDispositivo, controller.register);
router.use(requiereAuth);
router.post("/dispositivos/generar-codigo", controller.generateCode);
router.get("/paneles/:panelId/dispositivos", controller.list);
router.post("/paneles/:panelId/dispositivos", validarUuidParam("panelId"), controller.create);
router.get("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.get);
router.patch("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.update);
router.delete("/dispositivos/:dispositivoId", validarUuidParam("dispositivoId"), controller.remove);
module.exports = { publicRouter, router };
