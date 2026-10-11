#pragma once

// Copia este archivo como firmware_config.h y completa los valores locales.
// firmware_config.h está excluido por .gitignore.

const char* BACKEND_HOST          = "IP_O_HOST_DEL_BACKEND";
const int   BACKEND_PORT          = 3000;
const char* BACKEND_REGISTRO_PATH = "/api/dispositivos/registrar";

const char* MQTT_BROKER_HOST = "IP_O_HOST_DEL_BROKER";
const int   MQTT_BROKER_PORT = 8883; // 8883 con TLS; 1883 sin TLS

// PZEM-004T v3.0
// La biblioteca PZEM004Tv30 usa 9600 baudios internamente.
// El firmware admite uno o dos medidores en UART independientes.
#define PZEM_MEDIDORES_HABILITADOS 2
#define PZEM_SERIAL_BAUD_RATE      9600

#define PZEM_1_CIRCUITO             1
#define PZEM_1_RX_PIN               16
#define PZEM_1_TX_PIN               17
#define PZEM_1_DIRECCION            0xF8

#define PZEM_2_CIRCUITO             2
#define PZEM_2_RX_PIN               18
#define PZEM_2_TX_PIN               19
#define PZEM_2_DIRECCION            0xF8

// Pega aquí solamente el certificado público ca.crt de tu CA MQTT.
// Nunca pegues ca.key ni server.key.
const char* CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
PEGA_AQUI_EL_CONTENIDO_PUBLICO_DE_ca.crt
-----END CERTIFICATE-----
)EOF";

