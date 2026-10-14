const express = require("express"); // Permite crear rutas en Express

const controller = require("./accesos.controller"); // Importa las funciones que gestionan los accesos

const { requiereAuth } = require("../../middleware/authMiddleware"); // Importa el middleware de autenticación

const { validarUuidParam } = require("../../middleware/validateMiddleware"); // Importa el validador de IDs

const router = express.Router();

router.use(requiereAuth); // Exige que el usuario haya iniciado sesión

// Lista los usuarios que tienen acceso a un predio
router.get(
  "/predios/:predioId/accesos",
  validarUuidParam("predioId"),
  controller.list,
);

// Añade un usuario al listado de accesos de un predio
router.post(
  "/predios/:predioId/accesos",
  validarUuidParam("predioId"),
  controller.add,
);

// Cambia el rol o los permisos de un usuario dentro de un predio
router.patch(
  "/predios/:predioId/accesos/:usuarioId",
  validarUuidParam("predioId"),
  validarUuidParam("usuarioId"),
  controller.update,
);

// Elimina el acceso de un usuario a un predio
router.delete(
  "/predios/:predioId/accesos/:usuarioId",
  validarUuidParam("predioId"),
  validarUuidParam("usuarioId"),
  controller.remove,
);

module.exports = router;
