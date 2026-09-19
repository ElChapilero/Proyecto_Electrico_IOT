function emitirMedicionGuardada(io, payload) {
  if (io && payload) io.emit('mensaje-mqtt', payload);
}

function emitirEstadoDispositivo(io, payload) {
  if (io && payload) io.emit('estado-dispositivo', payload);
}

module.exports = { emitirMedicionGuardada, emitirEstadoDispositivo };
