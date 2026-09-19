// Punto de entrada para separar el enrutamiento MQTT de la lógica de mediciones.
// La implementación actual se conserva en mqttListener.js durante la transición.
function crearMqttMessageHandler({ procesarMedicion }) {
  return async function manejarMensaje(topic, payload) {
    return procesarMedicion(topic, payload);
  };
}

module.exports = { crearMqttMessageHandler };
