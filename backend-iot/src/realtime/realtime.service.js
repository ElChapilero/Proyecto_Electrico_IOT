// realtime.service.js
//
// Punto único por el que mqttListener.js envía eventos al dashboard.
// Ya no se usa io.emit() global, porque cualquier socket conectado podía
// recibir datos de otros predios (vulnerabilidad crítica 2.3).
//
// Ahora los eventos se envían únicamente a la sala "predio:<idPredio>".
// Un socket solo puede unirse a esa sala después de que socket.js verifica
// que el usuario tenga acceso a ese predio mediante accesos_predio.
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