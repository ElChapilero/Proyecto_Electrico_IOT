const express = require("express");

// Importa las funciones que atienden las solicitudes
const controller = require("./usuarios.controller"); 
// Importa el middleware de autenticación
const { requiereAuth } = require("../../middleware/authMiddleware");
const router = express.Router(); // Crea un grupo de rutas para los usuarios

// Exige autenticación para todas las rutas de este router
router.use(requiereAuth);

router.get("/me", controller.getMe);
router.patch("/me", controller.updateMe);

module.exports = router;
