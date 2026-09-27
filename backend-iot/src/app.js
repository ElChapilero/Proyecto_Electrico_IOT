const express = require("express");
const { corsOrigins } = require("./config/env");

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const permitido = origin && corsOrigins.includes(origin);
  if (permitido) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(permitido ? 204 : 403);
  next();
});
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const prediosRoutes = require("./modules/predios/predios.routes");
const accesosRoutes = require("./modules/accesos/accesos.routes");
const panelesRoutes = require("./modules/paneles/paneles.routes");
const { publicRouter: dispositivosPublicRoutes, router: dispositivosRoutes } = require("./modules/dispositivos/dispositivos.routes");
const circuitosRoutes = require("./modules/circuitos/circuitos.routes");
const medicionesRoutes = require("./modules/mediciones/mediciones.routes");
const analiticaRoutes = require("./modules/analitica/analitica.routes");
const alertasRoutes = require("./modules/alertas/alertas.routes");

// API versionada.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/usuarios", usuariosRoutes);
app.use("/api/v1/predios", prediosRoutes);
app.use("/api/v1", dispositivosPublicRoutes);
app.use(
  "/api/v1",
  accesosRoutes,
  panelesRoutes,
  dispositivosRoutes,
  circuitosRoutes,
  medicionesRoutes,
  analiticaRoutes,
  alertasRoutes,
);

// Compatibilidad temporal con el frontend actual y con el firmware ya instalado.
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/predios", prediosRoutes);
app.use("/api", dispositivosPublicRoutes);
app.use(
  "/api",
  accesosRoutes,
  panelesRoutes,
  dispositivosRoutes,
  circuitosRoutes,
  medicionesRoutes,
  analiticaRoutes,
  alertasRoutes,
);

app.use(require("./middleware/errorHandler"));

module.exports = app;
