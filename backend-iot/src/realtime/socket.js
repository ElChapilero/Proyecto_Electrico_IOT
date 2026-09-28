// (vulnerabilidad crítica 2.3).
// Ahora:
//   1) Se exige el mismo JWT usado por la API REST. El token se envía en
//      auth.token durante el handshake de Socket.IO.
//   2) El cliente debe solicitar unirse a cada predio que quiera ver. El
//      backend verifica nuevamente el acceso en accesos_predio y no confía
//      solo en el predio enviado por el cliente.
//   3) mqttListener.js ya no usa io.emit() global. Las mediciones se envían
//      únicamente a la sala correspondiente al predio mediante
//      realtime.service.js.

// En el frontend, la conexión usa:
//   const socket = io(URL, { auth: { token: miJwt } });
//   socket.emit('unirse-predio', { predioId }, (respuesta) => {...});
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { tieneAcceso } = require('../utils/accesoHelpers');

module.exports = function configurarSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Falta token de autenticacion'));

    try {
      socket.usuario = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); // { id, email }
      next();
    } catch (err) {
      next(new Error('Token invalido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🌐 Cliente del dashboard conectado (usuario ${socket.usuario.id})`);

    socket.on('unirse-predio', async ({ predioId } = {}, callback) => {
      try {
        if (!predioId) throw new Error('Falta predioId');

        const permitido = await tieneAcceso(predioId, socket.usuario.id);
        if (!permitido) throw new Error('Sin acceso a ese predio');

        socket.join(`predio:${predioId}`);
        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        console.warn(`⚠️ unirse-predio rechazado (usuario ${socket.usuario.id}):`, err.message);
        if (typeof callback === 'function') callback({ ok: false, error: err.message });
      }
    });

    socket.on('salir-predio', ({ predioId } = {}) => {
      if (predioId) socket.leave(`predio:${predioId}`);
    });

    socket.on('disconnect', () => console.log('🌐 Cliente desconectado'));
  });
};
