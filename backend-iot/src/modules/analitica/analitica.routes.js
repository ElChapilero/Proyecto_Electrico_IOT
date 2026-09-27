const express = require("express");
const controller = require("./analitica.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");
const router = express.Router();
router.use(requiereAuth);
router.get("/circuitos/:circuitoId/consumo", validarUuidParam("circuitoId"), controller.consumo);
router.get("/circuitos/:circuitoId/estadisticas", validarUuidParam("circuitoId"), controller.estadisticas);
router.get(
  "/circuitos/:circuitoId/comparaciones/semana-anterior",
  validarUuidParam("circuitoId"),
  controller.comparaciones,
);
module.exports = router;
