const express = require("express");
const controller = require("./alertas.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const { validarUuidParam } = require("../../middleware/validateMiddleware");
const router = express.Router();
router.use(requiereAuth);
router.get("/alertas", controller.list);
router.get("/predios/:predioId/configuracion-alertas", validarUuidParam("predioId"), controller.listConfig);
router.post(
  "/predios/:predioId/configuracion-alertas",
  validarUuidParam("predioId"),
  controller.createConfig,
);
router.patch(
  "/configuracion-alertas/:configuracionId",
  validarUuidParam("configuracionId"),
  controller.updateConfig,
);
router.delete(
  "/configuracion-alertas/:configuracionId",
  validarUuidParam("configuracionId"),
  controller.removeConfig,
);
module.exports = router;
