require("dotenv").config(); // cargar variables del archivo .env
const fs = require("fs"); // trabajar con archivos
const path = require("path"); // manejar rutas de archivos

// Verificar variables obligatorias
function required(name, predicate = (value) => value.trim().length > 0) {
  const value = process.env[name];
  if (!value || !predicate(value))
    throw new Error(`Falta configurar ${name} en el archivo .env`);
  return value.trim();
}

// Validar clave de autenticación
const jwtSecret = process.env.JWT_SECRET; // clave para los tokens JWT
const insecureJwtSecret =
  !jwtSecret ||
  jwtSecret.trim().length < 32 ||
  /REEMPLAZAR|CAMBIAR_ESTO|^(secret|password|changeme)$/i.test(
    jwtSecret.trim(), // detectar claves de ejemplo o poco seguras
  );
if (insecureJwtSecret) {
  throw new Error(
    "Falta configurar JWT_SECRET en el archivo .env (debe ser un secreto aleatorio de al menos 32 caracteres). " +
      "Generá uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex')).",
  );
}

// Validar conexión a PostgreSQL
const databaseUrl = required("DATABASE_URL", (value) => {
  try {
    return ["postgres:", "postgresql:"].includes(new URL(value).protocol); // comprobar que la dirección sea de PostgreSQL
  } catch (_) {
    return false;
  }
});

// Configurar conexión MQTT
const mqttTls = process.env.MQTT_TLS === "true"; // comprobar el cifrado TLS
const mqttHost = (
  process.env.MQTT_HOST ||
process.env.MQTT_BROKER_HOST || "").trim(); // obtener dirección del servidor MQTT

if (!mqttHost)
  throw new Error(
    "Falta configurar MQTT_HOST o MQTT_BROKER_HOST en el archivo .env",
  );

const mqttPort = Number(process.env.MQTT_PORT || process.env.MQTT_BROKER_PORT); // obtener el puerto MQTT

if (!Number.isInteger(mqttPort) || mqttPort < 1 || mqttPort > 65535)
  throw new Error("MQTT_PORT o MQTT_BROKER_PORT debe ser un puerto válido");

// Configurar certificado de seguridad MQTT
const mqttCaFile = process.env.MQTT_CA_FILE
  ? path.resolve(process.cwd(), process.env.MQTT_CA_FILE) // Ruta
  : path.resolve(__dirname, "../../../mqtt-broker-local/config/certs/ca.crt"); //ruta predeterminada (solo si no se configuro en el .env)

  if (mqttTls && !fs.existsSync(mqttCaFile))
  throw new Error(
    `MQTT_TLS=true pero no existe el certificado CA configurado en ${mqttCaFile}`,
  );

// Obtener credenciales MQTT
const mqttUser = required("MQTT_LISTENER_USER");
const mqttPassword = required("MQTT_LISTENER_PASSWORD");

// Configurar orígenes permitidos
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configurar tiempo máximo de las consultas
const statementTimeoutMs = Number(process.env.DB_STATEMENT_TIMEOUT_MS || 5000);

if (
  !Number.isInteger(statementTimeoutMs) ||
  statementTimeoutMs < 1000 ||
  statementTimeoutMs > 120000
)
  throw new Error(
    "DB_STATEMENT_TIMEOUT_MS debe ser un entero entre 1000 y 120000",
  );

// Exportar configuración del backend
module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret,
  databaseUrl,
  corsOrigins,
  statementTimeoutMs,
  mqtt: {
    tls: mqttTls,
    host: mqttHost,
    port: mqttPort,
    caFile: mqttCaFile,
    listenerUser: mqttUser,
    listenerPassword: mqttPassword,
  },
};
