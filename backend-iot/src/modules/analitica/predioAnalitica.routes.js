const express = require("express");
const controller = require("./predioAnalitica.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");
const { crearLimitadorDeIntentos } = require("../../middleware/rateLimitMiddleware");

const router = express.Router();
router.use(requiereAuth);
router.use(crearLimitadorDeIntentos({ maximoIntentos: 120, ventanaMs: 60_000, nombreRuta: "analitica-predio" }));
router.get("/predios/:predioId/analitica/current", validarUuidParam("predioId"), controller.current);
router.get("/predios/:predioId/analitica/daily", validarUuidParam("predioId"), controller.daily);
router.get("/predios/:predioId/analitica/weekly", validarUuidParam("predioId"), controller.weekly);
router.get("/predios/:predioId/analitica/monthly", validarUuidParam("predioId"), controller.monthly);
router.get("/predios/:predioId/analitica/history", validarUuidParam("predioId"), controller.history);
router.get("/predios/:predioId/analitica/comparison", validarUuidParam("predioId"), controller.comparison);
router.get("/predios/:predioId/analitica/statistics", validarUuidParam("predioId"), controller.statistics);

module.exports = router;
