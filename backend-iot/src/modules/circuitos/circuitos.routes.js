const express = require("express");
const controller = require("./circuitos.controller"); // Maneja las solicitudes
const { requiereAuth } = require("../../middleware/authMiddleware"); // Verifica el inicio de sesión
const { validarUuidParam } = require("../../middleware/validateMiddleware");  // Valida UUID

const router = express.Router(); // agrupar las rutas
router.use(requiereAuth); // Todas las rutas requieren autenticación.

router.get("/dispositivos/:dispositivoId/circuitos", validarUuidParam("dispositivoId"), controller.list);
router.post("/dispositivos/:dispositivoId/circuitos", validarUuidParam("dispositivoId"), controller.create);
router.get("/circuitos/:circuitoId", validarUuidParam("circuitoId"), controller.get);
router.patch("/circuitos/:circuitoId", validarUuidParam("circuitoId"), controller.update);
router.delete("/circuitos/:circuitoId", validarUuidParam("circuitoId"), controller.remove);

module.exports = router;
