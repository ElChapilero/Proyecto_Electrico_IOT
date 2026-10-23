// Verifica el JWT y comprueba el acceso antes de entrar a cada predio.
// Los eventos se envían solo a la sala del predio correspondiente.

// El frontend envía el token al conectar y solicita entrar al predio:
// const socket = io(URL, { auth: { token: miJwt } });
// socket.emit('unirse-predio', { predioId }, (respuesta) => {...});

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { tieneAcceso } = require('../utils/accesoHelpers');

module.exports = function configurarSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Falta token de autenticacion'));

    try {
      socket.usuario = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); // Datos del usuario: id y email.
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