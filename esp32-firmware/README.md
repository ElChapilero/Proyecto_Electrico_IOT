# Configuración local del firmware

Copia `firmware_config.example.h` como `firmware_config.h` y completa:

- host y puerto HTTP del backend;
- ruta de registro del dispositivo;
- host y puerto MQTT;
- el certificado público `ca.crt`.

`firmware_config.h` está ignorado por Git. No subas claves privadas ni credenciales MQTT.

