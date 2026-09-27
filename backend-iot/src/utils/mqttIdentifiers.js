// Define las reglas para los identificadores usados como usuarios MQTT,
// entradas del ACL de Mosquitto (acl.conf) o partes de un topic como "casa/<uuid_esp32>/#".

// La validación se hace antes de tocar la base de datos, Mosquitto o
// cualquier archivo de configuración. Solo se permiten letras, números,
// guion y guion bajo.

// Evita:
//   - Inyección de líneas en acl.conf mediante saltos de línea, espacios,
//     comillas u otros caracteres no permitidos.
//   - Topics MQTT ambiguos o manipulados con "/", "+" o "#".
//   - Valores inesperados al ejecutar comandos como docker exec o
//     mosquitto_passwd.

const ESP32_UUID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function esUuidEsp32Valido(valor) {
  return typeof valor === "string" && ESP32_UUID_PATTERN.test(valor);
}

module.exports = { ESP32_UUID_PATTERN, esUuidEsp32Valido };
