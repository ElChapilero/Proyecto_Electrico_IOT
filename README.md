# Proyecto IoT

## Configuración local

1. Copia `backend-iot/.env.example` como `backend-iot/.env`.
2. Sustituye todos los valores `REEMPLAZAR`, `USUARIO`, `CONTRASENA` y `HOST`.
3. Crea la base de datos ejecutando `db-iot/schema.sql`.
4. Genera los certificados MQTT con `mqtt-broker-local/config/scripts/generate-certs.sh`.
5. Crea `mqtt-broker-local/config/passwd` con `mosquitto_passwd` y configura `acl.conf` a partir de sus ejemplos.
6. Instala dependencias en `backend-iot` y `frontend` con `npm install`.
7. Con PostgreSQL y el backend activos, ejecuta `npm run test:api` dentro de `backend-iot` para probar el flujo principal sin frontend.

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

La ruta antigua `/api/dispositivos/registrar` conserva respuesta `200` para
mantener la compatibilidad con el firmware existente. La versión
`/api/v1/dispositivos/registrar` responde `201` al crear correctamente.

## Mejoras futuras de autenticación

- Verificación de correo electrónico.
- Recuperación de contraseña.

La verificación de correo será conveniente cuando el sistema se exponga
públicamente o sea necesario comprobar que el usuario controla esa dirección.
