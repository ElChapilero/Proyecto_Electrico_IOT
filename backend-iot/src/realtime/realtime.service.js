
// Cada evento se envía solo a la sala de su predio.
// socket.js verifica los permisos antes de permitir el acceso a la sala.

function emitirMedicionGuardada(io, idPredio, payload) {
  if (io && idPredio && payload) io.to(`predio:${idPredio}`).emit('mensaje-mqtt', payload);
}

function emitirEstadoDispositivo(io, idPredio, payload) {
  if (io && idPredio && payload) io.to(`predio:${idPredio}`).emit('estado-dispositivo', payload);
}

function emitirAlertaGenerada(io, idPredio, alerta) {
  if (io && idPredio && alerta) io.to(`predio:${idPredio}`).emit('alerta-generada', alerta);
}

module.exports = { emitirMedicionGuardada, emitirEstadoDispositivo, emitirAlertaGenerada };