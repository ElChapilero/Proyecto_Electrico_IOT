# Base del frontend

La primera etapa usa Vue 3, Composition API, Vue Router, `fetch` centralizado y Socket.IO Client. Todas las peticiones del frontend usan `/api/v1`; el JWT se valida exclusivamente con `GET /api/v1/auth/me`.

## Contratos utilizados

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/usuarios/me`
- `PATCH /api/v1/usuarios/me`
- `GET /api/v1/predios`
- Socket.IO: `unirse-predio`, `salir-predio`, `mensaje-mqtt`, `estado-dispositivo`, `alerta-generada`

## Pendientes bloqueados por contrato

Las ventanas de analítica, alertas, historial, administración de dispositivos y configuración se dejaron fuera de esta etapa. Antes de implementarlas se deben usar los endpoints y formas de respuesta comprobados en sus módulos backend. En particular, no existe actualmente un endpoint comprobado para marcar una alerta como revisada; tampoco se incorpora una variable energética fuera del contrato vigente.
