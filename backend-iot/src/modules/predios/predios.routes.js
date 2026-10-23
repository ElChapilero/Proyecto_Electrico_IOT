const express = require("express"); // Permite crear rutas en Express

// Importa las funciones que gestionan las solicitudes de predios
const controller = require("./predios.controller");

const { requiereAuth } = require("../../middleware/authMiddleware"); // Importa el middleware de autenticación

const { validarUuidParam } = require("../../middleware/validateMiddleware"); // Importa el validador de parámetros UUID

const router = express.Router();

router.use(requiereAuth); // Exige autenticación para todas las rutas de este archivo

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:predioId", validarUuidParam("predioId"), controller.get);
router.patch("/:predioId", validarUuidParam("predioId"), controller.update);
router.delete("/:predioId", validarUuidParam("predioId"), controller.remove);

module.exports = router;
