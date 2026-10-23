#pragma once

// Copia este archivo como firmware_config.h y completa los valores locales.
// firmware_config.h está excluido por .gitignore.

const char* BACKEND_HOST          = "192.168.1.11";
const int   BACKEND_PORT          = 3000;
const char* BACKEND_REGISTRO_PATH = "/api/v1/dispositivos/registrar";

const char* MQTT_BROKER_HOST = "192.168.1.11";
const int   MQTT_BROKER_PORT = 8883; // 8883 con TLS; 1883 sin TLS

// Pega aquí solamente el certificado público ca.crt de tu CA MQTT.
// Nunca pegues ca.key ni server.key.
const char* CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFDzCCAvegAwIBAgIUfK4MVAAKudurNN0uwj/aSxHnvCUwDQYJKoZIhvcNAQEL
BQAwFzEVMBMGA1UEAwwMSW9UIExvY2FsIENBMB4XDTI2MTAxNTA0NDg0MFoXDTM2
MTAxMjA0NDg0MFowFzEVMBMGA1UEAwwMSW9UIExvY2FsIENBMIICIjANBgkqhkiG
9w0BAQEFAAOCAg8AMIICCgKCAgEA2FRRAE/8rKHrIFN14rTDwTo5KZcTBl9Lfniv
6FTtSK/W4l849ONNe7PEj2kgD9lV3MW6xCEm8Pn8+JIYfWXCmAUa07MPTcSXaqKR
s3cTB/YV7CS0vXhjmvN6n8HsDBMa1ltFKwp+j3m9GqS50jq2n6CnM5nwxfgFGekP
w1YsYW7PEUlFACIDXf2slQ7gPp3gyc3yqAIoAI3zI2puQHIIrgJh78e8QcBLMchx
vMqynDrSW3JOB5BB+ptknNYjPrk+wVkQ+GI8b9kCrRLI6eyUxzwZccRN0Zce5SpB
dXkxhjKN0bElDUlwkGrl4XPrrNAyDdSeU00Yc7JOX/TPimonHuV8JY2wOlQ/lC9F
Gdwnzr9d1s+bQSF5qCGv9BmO7IsOlEwpwWr9DyjcEPy14Gf+quZBgFCXQzgIWCVg
Xp/Y8drJZmo+efCnQjKRmLqxkFwESzUTw32/zdIqu/AYk6gxKke2PZSUPUVEqpuV
hpE4RlOd2bNW1MOFOD0sv+wVvUYFVH1klAysE3h8GNv3s8YJjbnx00d5OXNmx3pm
MCgkqegXj1ys11gaGUCuvqKrdkzH6aYpPvwmofdqMCDf8BU9Up+3uw0KKyzpeusB
U7Yz81yfol/sCGT36Jn3O1swKuZvu7dj3vFnUOPv6S3Fs2obpE26YFo3jM9eLqn+
NSdDbZcCAwEAAaNTMFEwHQYDVR0OBBYEFAwsSuGd+8bXn6fRwg4H6QWfjWXLMB8G
A1UdIwQYMBaAFAwsSuGd+8bXn6fRwg4H6QWfjWXLMA8GA1UdEwEB/wQFMAMBAf8w
DQYJKoZIhvcNAQELBQADggIBAEKQtMbcZ+r0dB36YmQYpdxgM/suuh2n5DVXrUda
RupSeRhyv6quovRQ8sJUnUOjUjDrIUQFG17Rhun0SQ9VLOdZqIYa0R6XRX0HzyFN
C08jQBLgEJfaP9E+PmOPL1YfbezQ7tVGXIHGc7/QI76sEE+QgITYQLiBpYRaFeXp
lLnAhaZymrLew/8TG/yt/KhFrkpcg2qHL8hGi9aZpURx7mWQpLzQ29tnLdD6hveJ
tM20GqNivIYGcffGCzqfZ9tqnw+utURNjzxizdjzTfBnW+PknCJSNSEyhvWhS+Bm
Hi44Q5BJTcd7pM9j0Vee+YPYPsxcC//Mf7GXsvLOmoMxhnv/+ExqerWjXibdJ0A8
FkPnJ+VoY4puZexfLr/yqW3l7lsabQZsn0OcrmEFZM/Nl9WXRm9kkFT0TyUTjdaq
u4EwS/utZ1PY6zHrwyN0VDqGjxbN7GIyE2VTsUfsjIG1kaGq7J41ktPUKqDvdWpX
OCsoINrvJtsZTrakB6ll9muPZ8pcCjU6XtMTcuslNebLYclFUEmmfg92o3t/ALYz
RLD35X6D9Wxy5ZT3dBwbifVyrWhvU4qK6YY358vs2SBViQCPsxwiK2QKxf7NmpsK
Soj/GlRxNgf75oLSNleaVHLA0+SrSJtlJzs6RgXnLQe3KsC3sJe4/i/nyFJZlaXl
9adp
-----END CERTIFICATE-----
)EOF";

