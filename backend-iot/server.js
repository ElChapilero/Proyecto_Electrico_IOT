// Importar componentes
const http = require("http"); // crear servidor HTTP
const { Server } = require("socket.io"); // comunicación en tiempo real

const { port } = require("./src/config/env"); // puerto del servidor
const app = require("./src/app"); // configuración de rutas
const pool = require("./src/config/db"); // conexión a la base de datos
const { iniciarMqttListener } = require("./src/mqtt/mqttListener");// escuchar mensajes MQTT
const configurarSocket = require("./src/realtime/socket"); // configurar Socket.IO
const server = http.createServer(app); // crear servidor con la aplicación
const io = new Server(server);// habilitar Socket.IO en el servidor

// Iniciar comunicaciones
configurarSocket(io); // configurar conexiones en tiempo real
iniciarMqttListener(io); // iniciar escucha de mensajes MQTT

// Manejar errores graves
let cerrando = false;
function apagarPorError(error, tipo) {
  console.error(`FATAL: ${tipo}`, error);
  if (cerrando) return;
  cerrando = true;
  server.close(() => pool.end(() => process.exit(1))); // cerrar servidor y base de datos
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("uncaughtException", (error) =>
  apagarPorError(error, "uncaughtException"), // manejar excepciones no capturadas
);
process.on("unhandledRejection", (reason) =>
  apagarPorError(reason, "unhandledRejection"), // manejar operaciones fallidas
);

server.listen(port, () => {
  console.log(`Backend corriendo en http://localhost:${port}`);
});

module.exports = { app, server, io }; //permite usarlo en otros archivos
