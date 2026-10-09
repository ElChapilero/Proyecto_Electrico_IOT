# Proyecto IoT

## Configuración local

1. Copia `backend-iot/.env.example` como `backend-iot/.env`.
2. Sustituye todos los valores `REEMPLAZAR`, `USUARIO`, `CONTRASENA` y `HOST`.
3. Crea la base de datos ejecutando `db-iot/schema.sql`.
4. Inicia Docker Desktop. Para Windows PowerShell, prepara el broker con:

   ```powershell
   .\mqtt-broker-local\setup-broker.ps1 -BrokerIp 127.0.0.1
   ```

   Si el ESP32 se conectará desde otra máquina, usa la IP LAN de este computador
   en lugar de `127.0.0.1` (por ejemplo `-BrokerIp 192.168.20.26`). El script
   crea los certificados TLS, `config/acl.conf`, `config/passwd` y los directorios
   persistentes ignorados por Git.

   En Linux/macOS también puedes usar `mqtt-broker-local/config/scripts/generate-certs.sh <IP_DEL_BROKER>`,
   copiar `acl.conf.example` a `acl.conf` y crear `passwd` con `mosquitto_passwd`.
5. Levanta el broker:

   ```powershell
   cd mqtt-broker-local
   docker compose up -d
   docker compose ps
   docker compose logs -f mosquitto
   ```

   El compose ya existente es el broker local; no hace falta crear otro
   contenedor de Mosquitto. Expone MQTT sin TLS en `1883`, MQTT con TLS en
   `8883` y WebSockets en `9001`.

6. Copia la contraseña del usuario `backend_listener` al `.env` y verifica que
   `MQTT_CA_FILE` apunte a `../mqtt-broker-local/config/certs/ca.crt`. Para el
   backend ejecutado en este mismo computador usa normalmente
   `MQTT_HOST=localhost` y `MQTT_PORT=8883`. La IP LAN se usa en el firmware,
   no necesariamente en el backend.
7. Instala dependencias en `backend-iot` y `frontend` con `npm install`.
8. Con PostgreSQL y el backend activos, ejecuta `npm run test:api` dentro de `backend-iot` para probar el flujo principal sin frontend.

### Qué falta para ejecutar todo desde un computador nuevo

- Docker Desktop iniciado y permiso para que el usuario acceda al daemon.
- PostgreSQL local activo, con una base `dbproyecto-iot`; ejecuta `db-iot/schema.sql`
  con el usuario indicado en `backend-iot/.env`. Este repositorio todavía no
  incluye un compose para PostgreSQL.
- `backend-iot/.env` completo, especialmente `DATABASE_URL`, `JWT_SECRET`, la
  contraseña MQTT y la ruta del certificado CA.
- Dependencias Node instaladas y puertos libres: `3000`, `5173`, `1883`, `8883`
  y `9001`.
- Para usar el ESP32: `firmware_config.h` generado desde su ejemplo, la IP LAN
  del computador accesible desde el dispositivo, el puerto `8883`, `ca.crt` y
  reglas de firewall para el puerto MQTT.

Los archivos `.env`, contraseñas, claves privadas, logs y datos del broker están
excluidos mediante `.gitignore`. Antes del primer `git push`, comprueba que no
aparezcan en `git status`.

## Tiempo de las mediciones

`timestamp_ms` del ESP32 representa epoch Unix en milisegundos, obtenido con
`gettimeofday()` después de sincronizar NTP; no es tiempo desde el arranque.
El backend captura una sola fecha de adquisición para todo el JSON y la guarda
en todas sus mediciones.

Para mostrar mediciones, ordénalas por la fecha y después por el circuito:

```sql
SELECT m.*, c.indice AS circuito
FROM mediciones m
JOIN circuitos c ON c.id = m.circuito_id
ORDER BY m.created_at ASC, c.indice ASC, m.id ASC;
```

El UUID `id` no representa el orden de inserción.

## API v1

Todas las rutas de esta sección comienzan con `/api/v1`. Salvo las rutas de
registro/login y `POST /dispositivos/registrar`, requieren `Authorization:
Bearer <JWT>`.

| Método | Endpoint | Permiso | Body/query | Respuestas principales |
|---|---|---|---|---|
| POST | `/auth/register`, `/auth/registro` | Público | `email`, `nombre`, `password` | 201, 400, 409 |
| POST | `/auth/login` | Público | `email`, `password` | 200, 400, 401, 429 |
| GET | `/auth/me` | JWT válido | — | 200, 401, 404 |
| GET/PATCH | `/usuarios/me` | Propio usuario | PATCH: `email`, `nombre` | 200, 400, 401, 409 |
| GET/POST/PATCH/DELETE | `/predios`, `/predios/:predioId` | Acceso; escritura administrador | Predio: `nombre`, `tipo_predio` | 200/201/204, 400, 403, 404 |
| GET/POST/PATCH/DELETE | `/predios/:predioId/accesos`, `.../:usuarioId` | Administrador del predio | `email`, `rol` | 200/201/204, 400, 403, 404, 409 |
| GET/POST | `/predios/:predioId/paneles` | Acceso/administrador | `nombre`, `tipo_panel`, `id_panel_principal` | 200/201, 400, 403, 404 |
| GET/PATCH/DELETE | `/paneles/:panelId` | Acceso/administrador | PATCH: `nombre` | 200/204, 400, 403, 404 |
| POST | `/dispositivos/registrar` | Público + código vigente | `uuid_esp32`, `codigo` | 201, 400, 404, 409, 429 |
| POST | `/dispositivos/generar-codigo` | Administrador del panel | `panelId` | 200, 400, 403, 404 |
| GET/POST | `/paneles/:panelId/dispositivos` | Acceso/administrador | POST: `uuid_esp32`, `nombre`, `circuitos` | 200/201, 400, 403, 404, 409 |
| GET/PATCH/DELETE | `/dispositivos/:dispositivoId` | Acceso/administrador | PATCH: `nombre`, `id_panel` | 200/204, 400, 403, 404 |
| GET/POST | `/dispositivos/:dispositivoId/circuitos` | Acceso/administrador | POST: `nombre`, `indice` | 200/201, 400, 403, 404, 409 |
| GET/PATCH/DELETE | `/circuitos/:circuitoId` | Acceso/administrador | PATCH: `nombre`, `estado` | 200/204, 400, 403, 404 |
| GET | `/circuitos/:circuitoId/mediciones/actual` | Acceso al predio | — | 200, 403, 404 |
| GET | `/circuitos/:circuitoId/mediciones` | Acceso al predio | `limit`, `from`, `to` | 200, 400, 403, 404 |
| GET | `/circuitos/:circuitoId/consumo` | Acceso al predio | `from`, `to`, `group` | 200, 400, 403, 404 |
| GET | `/circuitos/:circuitoId/estadisticas` | Acceso al predio | `from`, `to` | 200, 400, 403, 404 |
| GET | `/circuitos/:circuitoId/comparaciones/semana-anterior` | Acceso al predio | — | 200, 403, 404 |
| GET | `/alertas` | Acceso derivado del recurso | — | 200, 401 |
| GET/POST | `/predios/:predioId/configuracion-alertas` | Acceso/administrador | Configuración de alerta | 200/201, 400, 403, 404, 409 |
| PATCH/DELETE | `/configuracion-alertas/:configuracionId` | Administrador del predio | PATCH: campos de configuración | 200/204, 400, 403, 404 |

Los UUID de ruta se validan antes de consultar PostgreSQL. `400` representa
entrada inválida; `401` autenticación ausente o inválida; `403` falta de
permiso; `404` recurso inexistente o no visible; y `409` conflictos de
unicidad o estado.

### Analítica por predio

La analítica se agrupa bajo el predio, que es el recurso donde comienza la
autorización. Todas estas rutas requieren JWT y comprueban la relación
usuario → acceso al predio → panel → dispositivo → circuito:

```text
GET /api/v1/predios/:predioId/analitica/current
GET /api/v1/predios/:predioId/analitica/daily
GET /api/v1/predios/:predioId/analitica/weekly
GET /api/v1/predios/:predioId/analitica/monthly
GET /api/v1/predios/:predioId/analitica/history
GET /api/v1/predios/:predioId/analitica/comparison
GET /api/v1/predios/:predioId/analitica/statistics
```

Aceptan filtros combinables como `from`, `to`, `circuitId`, `deviceId`,
`panelId`, `variables`, `granularity` y `limit`. Las respuestas usan
`data`, `meta` y `filters`. `history` admite `granularity=raw|hour|day|week|month|auto`;
`auto` usa datos horarios para rangos mayores de siete días.

La tabla `mediciones_horarias` es derivada y conserva las mediciones originales
como fuente de verdad. Aplica la migración [001_mediciones_horarias.sql](db-iot/migrations/001_mediciones_horarias.sql)
con PostgreSQL antes de levantar el backend.

El agregado marca `energia_reset_detectado=true` y deja `consumo_energia` en
`NULL` cuando el contador retrocede. Esto evita presentar como consumo válido
un reinicio del PZEM. La semántica definitiva de `energia` debe confirmarse
con el payload real antes de interpretar todos los consumos como kWh.

Para probar las rutas, registra/inicia sesión, toma el JWT y consulta, por
ejemplo:

```powershell
curl.exe -H "Authorization: Bearer <JWT>" "http://localhost:3000/api/v1/predios/<PREDIO_ID>/analitica/history?from=2026-09-01T00:00:00Z&to=2026-09-28T23:59:59Z&granularity=hour"
```

La ruta antigua `/api/dispositivos/registrar` conserva respuesta `200` para
mantener la compatibilidad con el firmware existente. La versión
`/api/v1/dispositivos/registrar` responde `201` al crear correctamente.

## Mejoras futuras de autenticación

- Verificación de correo electrónico.
- Recuperación de contraseña.

La verificación de correo será conveniente cuando el sistema se exponga
públicamente o sea necesario comprobar que el usuario controla esa dirección.
