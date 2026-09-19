# Proyecto IoT

## Configuración local

1. Copia `backend-iot/.env.example` como `backend-iot/.env`.
2. Sustituye todos los valores `REEMPLAZAR`, `USUARIO`, `CONTRASENA` y `HOST`.
3. Crea la base de datos ejecutando `db-iot/schema.sql`.
4. Genera los certificados MQTT con `mqtt-broker-local/config/scripts/generate-certs.sh`.
5. Crea `mqtt-broker-local/config/passwd` con `mosquitto_passwd` y configura `acl.conf` a partir de sus ejemplos.
6. Instala dependencias en `backend-iot` y `frontend` con `npm install`.

Los archivos `.env`, contraseñas, claves privadas, logs y datos del broker están
excluidos mediante `.gitignore`. Antes del primer `git push`, comprueba que no
aparezcan en `git status`.

## Tiempo de las mediciones

`timestamp_ms` del ESP32 representa milisegundos desde que el dispositivo se
encendió; no es una fecha ni una hora de calendario. El backend captura una
sola fecha de recepción para todo el JSON y la guarda en todas sus mediciones.

Para mostrar mediciones, ordénalas por la fecha y después por el circuito:

```sql
SELECT m.*, c.indice AS circuito
FROM mediciones m
JOIN circuitos c ON c.id = m.circuito_id
ORDER BY m.created_at ASC, c.indice ASC, m.id ASC;
```

El UUID `id` no representa el orden de inserción.
