# Certificados MQTT locales

No subas `ca.key`, `server.key` ni certificados privados al repositorio.
El certificado público `ca.crt` puede distribuirse a los clientes para validar
el broker, pero las claves privadas deben permanecer solo en el entorno local.

Desde esta carpeta, genera una CA y un certificado para el broker ejecutando:

```bash
chmod +x ../scripts/generate-certs.sh
../scripts/generate-certs.sh
```

Después verifica que `mosquitto.conf` apunte a `server.crt` y `server.key`, y
copia el contenido público de `ca.crt` al firmware si el ESP32 usa TLS.
