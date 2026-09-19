const http = require('http');
const { Server } = require('socket.io');

const { port } = require('./src/config/env');
const app = require('./src/app');
const { iniciarMqttListener } = require('./src/mqtt/mqttListener');
const configurarSocket = require('./src/realtime/socket');
const server = http.createServer(app);
const io = new Server(server);

configurarSocket(io);
iniciarMqttListener(io);

server.listen(port, () => {
  console.log(`Backend corriendo en http://localhost:${port}`);
});

module.exports = { app, server, io };
