#pragma once

// Copia este archivo como firmware_config.h y completa los valores locales.
// firmware_config.h está excluido por .gitignore.

const char* BACKEND_HOST          = "IP_O_HOST_DEL_BACKEND";
const int   BACKEND_PORT          = 3000;
const char* BACKEND_REGISTRO_PATH = "/api/dispositivos/registrar";

const char* MQTT_BROKER_HOST = "IP_O_HOST_DEL_BROKER";
const int   MQTT_BROKER_PORT = 8883; // 8883 con TLS; 1883 sin TLS

// Pega aquí solamente el certificado público ca.crt de tu CA MQTT.
// Nunca pegues ca.key ni server.key.
const char* CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
PEGA_AQUI_EL_CONTENIDO_PUBLICO_DE_ca.crt
-----END CERTIFICATE-----
)EOF";

