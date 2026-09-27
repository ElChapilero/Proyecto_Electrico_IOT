require('dotenv').config();
const fs = require('fs');
const path = require('path');

function required(name, predicate = (value) => value.trim().length > 0) {
  const value = process.env[name];
  if (!value || !predicate(value)) throw new Error(`Falta configurar ${name} en el archivo .env`);
  return value.trim();
}

// Ahora el backend se niega a arrancar sin un secreto real:
// es preferible que falle fuerte y visible al iniciar, a que corra en
// producción con un secreto público y predecible.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.trim().length < 16) {
  throw new Error(
    'Falta configurar JWT_SECRET en el archivo .env (o tiene menos de 16 caracteres). ' +
    'Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))" ' +
    'y pegalo en JWT_SECRET dentro de tu .env antes de levantar el backend.',
  );
}

const databaseUrl = required('DATABASE_URL', (value) => {
  try { return ['postgres:', 'postgresql:'].includes(new URL(value).protocol); } catch (_) { return false; }
});
const mqttTls = process.env.MQTT_TLS === 'true';
const mqttHost = (process.env.MQTT_HOST || process.env.MQTT_BROKER_HOST || '').trim();
if (!mqttHost) throw new Error('Falta configurar MQTT_HOST o MQTT_BROKER_HOST en el archivo .env');
const mqttPort = Number(process.env.MQTT_PORT || process.env.MQTT_BROKER_PORT);
if (!Number.isInteger(mqttPort) || mqttPort < 1 || mqttPort > 65535) throw new Error('MQTT_PORT o MQTT_BROKER_PORT debe ser un puerto válido');
const mqttCaFile = process.env.MQTT_CA_FILE ? path.resolve(process.cwd(), process.env.MQTT_CA_FILE) : path.resolve(__dirname, '../../../mqtt-broker-local/config/certs/ca.crt');
if (mqttTls && !fs.existsSync(mqttCaFile)) throw new Error(`MQTT_TLS=true pero no existe el certificado CA configurado en ${mqttCaFile}`);
const mqttUser = required('MQTT_LISTENER_USER');
const mqttPassword = required('MQTT_LISTENER_PASSWORD');
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret,
  databaseUrl,
  corsOrigins,
  mqtt: {
    tls: mqttTls,
    host: mqttHost,
    port: mqttPort,
    caFile: mqttCaFile,
    listenerUser: mqttUser,
    listenerPassword: mqttPassword,
  },
};
