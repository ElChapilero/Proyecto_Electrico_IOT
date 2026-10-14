// Patrón permitido para identificadores de dispositivos ESP32.
const ESP32_UUID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Comprueba que el identificador sea texto y cumpla el patrón.
function esUuidEsp32Valido(valor) {
  return typeof valor === "string" && ESP32_UUID_PATTERN.test(valor);
}

module.exports = { ESP32_UUID_PATTERN, esUuidEsp32Valido };
