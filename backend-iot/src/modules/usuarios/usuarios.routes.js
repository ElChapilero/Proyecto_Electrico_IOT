const express = require("express");
const controller = require("./usuarios.controller");
const { requiereAuth } = require("../../middleware/authMiddleware");
const router = express.Router();
router.use(requiereAuth);
router.get("/me", controller.getMe);
router.patch("/me", controller.updateMe);
module.exports = router;
