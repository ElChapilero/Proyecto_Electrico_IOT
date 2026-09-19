module.exports = {
  tls: process.env.MQTT_TLS === 'true',
  host: process.env.MQTT_HOST || process.env.MQTT_BROKER_HOST || 'localhost',
  port: Number(process.env.MQTT_PORT || process.env.MQTT_BROKER_PORT || (process.env.MQTT_TLS === 'true' ? 8883 : 1883)),
  listenerUser: process.env.MQTT_LISTENER_USER || 'backend_listener',
  listenerPassword: process.env.MQTT_LISTENER_PASSWORD || '',
};
