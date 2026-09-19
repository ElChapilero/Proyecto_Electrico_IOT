module.exports = function configurarSocket(io) {
  io.on('connection', (socket) => {
    console.log('🌐 Cliente del dashboard conectado');
    socket.on('disconnect', () => console.log('🌐 Cliente desconectado'));
  });
};
