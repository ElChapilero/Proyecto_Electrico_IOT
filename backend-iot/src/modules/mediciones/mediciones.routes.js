const express = require("express");
const controller = require("./mediciones.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");
const router = express.Router();
router.use(requiereAuth);
router.get("/circuitos/:circuitoId/mediciones/actual", validarUuidParam("circuitoId"), controller.actual);
router.get("/circuitos/:circuitoId/mediciones", validarUuidParam("circuitoId"), controller.list);
module.exports = router;
