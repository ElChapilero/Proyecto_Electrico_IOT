// Importar componentes
const express = require("express"); // manejar rutas y peticiones HTTP
const { corsOrigins } = require("./config/env"); // Conexiones permitidas

const app = express();

// Configurar de archivos y datos recibidos
app.use(express.static("public"));
app.use(express.json()); // leer formato JSON

// Configurar permisos de conexión (CORS)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const permitido = origin && corsOrigins.includes(origin);
  if (permitido) {
    res.setHeader("Access-Control-Allow-Origin", origin); // permitir el origen
    res.setHeader("Vary", "Origin"); //respuesta depende del origen
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // encabezados permitidos
  }
  if (req.method === "OPTIONS") return res.sendStatus(permitido ? 204 : 403); // responder a la petición de permisos
  next();
});

// que la petición tenga un valor
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {}; // asignar un objeto vacío
  next();
});

// Importar rutas de los módulos
const authRoutes = require("./modules/auth/auth.routes");
const usuariosRoutes = require("./modules/usuarios/usuarios.routes");
const prediosRoutes = require("./modules/predios/predios.routes");
const accesosRoutes = require("./modules/accesos/accesos.routes");
const panelesRoutes = require("./modules/paneles/paneles.routes");
const { publicRouter: dispositivosPublicRoutes, router: dispositivosRoutes } = require("./modules/dispositivos/dispositivos.routes");
const circuitosRoutes = require("./modules/circuitos/circuitos.routes");
const medicionesRoutes = require("./modules/mediciones/mediciones.routes");
const analiticaRoutes = require("./modules/analitica/analitica.routes");
const predioAnaliticaRoutes = require("./modules/analitica/predioAnalitica.routes");
const alertasRoutes = require("./modules/alertas/alertas.routes");

// Rutas de la API
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/usuarios", usuariosRoutes);
app.use("/api/v1/predios", prediosRoutes);
app.use("/api/v1", dispositivosPublicRoutes); // rutas públicas de dispositivos

app.use(
  "/api/v1",
  accesosRoutes,
  panelesRoutes,
  dispositivosRoutes,
  circuitosRoutes,
  medicionesRoutes,
  analiticaRoutes,
  predioAnaliticaRoutes,
  alertasRoutes,
);

// Manejar errores de la aplicacion (express)
app.use(require("./middleware/errorHandler")); // capturar y responder a errores

module.exports = app;
