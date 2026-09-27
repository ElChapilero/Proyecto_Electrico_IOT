const http = require('http');
const { Server } = require('socket.io');

const { port } = require('./src/config/env');
const app = require('./src/app');
const pool = require('./src/config/db');
const { iniciarMqttListener } = require('./src/mqtt/mqttListener');
const configurarSocket = require('./src/realtime/socket');
const server = http.createServer(app);
const io = new Server(server);

configurarSocket(io);
iniciarMqttListener(io);

let cerrando = false;
function apagarPorError(error, tipo) {
  console.error(`FATAL: ${tipo}`, error);
  if (cerrando) return;
  cerrando = true;
  server.close(() => pool.end(() => process.exit(1)));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('uncaughtException', (error) => apagarPorError(error, 'uncaughtException'));
process.on('unhandledRejection', (reason) => apagarPorError(reason, 'unhandledRejection'));

server.listen(port, () => {
  console.log(`Backend corriendo en http://localhost:${port}`);
});

module.exports = { app, server, io };
