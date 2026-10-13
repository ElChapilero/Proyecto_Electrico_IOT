// Exportar configuración MQTT
// configuraciones necesarias para conectar a mqtt
module.exports = {
  tls: process.env.MQTT_TLS === "true",
  host: process.env.MQTT_HOST || process.env.MQTT_BROKER_HOST || "localhost",
  port: Number(
    process.env.MQTT_PORT ||
      process.env.MQTT_BROKER_PORT ||
      (process.env.MQTT_TLS === "true" ? 8883 : 1883), //8883 con TLS y 1883 sin TLS.
  ),
  listenerUser: process.env.MQTT_LISTENER_USER || "backend_listener", // usuario para conectarse a MQTT
  listenerPassword: process.env.MQTT_LISTENER_PASSWORD || "",
};
