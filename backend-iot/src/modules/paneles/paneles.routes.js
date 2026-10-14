// Express para crear las rutas de la API.
const express = require("express");

const controller = require("./paneles.controller"); // Operaciones de los paneles.

const { requiereAuth } = require("../../middleware/authMiddleware"); //comprueba si el usuario inició sesión.

const { validarUuidParam } = require("../../middleware/validateMiddleware"); // formato UUID válido.

// organizar las rutas relacionadas con los paneles.
const router = express.Router();
router.use(requiereAuth); // Exige que el usuario esté autenticado

router.get("/predios/:predioId/paneles", validarUuidParam("predioId"), controller.list);
router.post("/predios/:predioId/paneles", validarUuidParam("predioId"), controller.create);
router.get("/paneles/:panelId", validarUuidParam("panelId"), controller.get);
router.patch("/paneles/:panelId", validarUuidParam("panelId"), controller.update);
router.delete("/paneles/:panelId", validarUuidParam("panelId"), controller.remove);
module.exports = router;
