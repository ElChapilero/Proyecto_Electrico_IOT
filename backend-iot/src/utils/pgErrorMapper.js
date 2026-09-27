// Red de seguridad para los errores de PostgreSQL que llegan sin haber sido
// convertidos previamente por un service a un error de aplicación
// (con .status y .publicMessage).

// (Fix bug importante 4.1) Antes, una violación de una restricción de la
// base de datos que no se capturara en el service terminaba en
// errorHandler.js como un 500 genérico, aunque el error permitiera saber
// que realmente era un 400, 404 o 409.

// Algunos casos que podían ocurrir en este proyecto:
//   - Cambiar en PATCH /usuarios/me un email que ya está registrado.
//   - Crear un circuito con un índice que ya existe.
//   - Enviar un id con formato inválido en un parámetro de la URL.

// En lugar de repetir try/catch en cada service, esta traducción se hace
// una sola vez acá y se conecta con errorHandler.js. Así, cualquier error
// de PostgreSQL que podamos reconocer se convierte automáticamente en el
// error HTTP correspondiente, sin importar desde qué service se produzca.

// Códigos de PostgreSQL usados (ver documentación oficial):
//   23505 unique_violation             -> 409 (el registro ya existe)
//   23503 foreign_key_violation        -> 404 (la referencia no existe)
//   23514 check_violation              -> 400 (el dato no cumple una regla)
//   22P02 invalid_text_representation  -> 400 (id/UUID con formato inválido)
//   22007 invalid_datetime_format      -> 400 (fecha from/to inválida)

// Para las restricciones más comunes de la API se definen mensajes
// específicos. Si una restricción no está contemplada, se usa un mensaje
// genérico según el tipo de error. El código HTTP se mantiene correcto,
// aunque el mensaje sea menos detallado.

const MENSAJES_UNIQUE = {
  usuarios_email_key: "Ya existe una cuenta con ese correo",
  uq_acceso_predio_usuario: "Ese usuario ya tiene acceso a este predio",
  dispositivos_uuid_esp32_key: "Ya existe un dispositivo con ese uuid_esp32",
  uq_dispositivo_indice:
    "Ya existe un circuito con ese índice para este dispositivo",
  codigos_vinculacion_codigo_key: "Ese código ya existe, generá uno nuevo",
  uq_configuracion_alerta_circuito_variable:
    "Ya existe una configuración de alerta para esa variable en este circuito",
};

// Devuelve { status, publicMessage } si "error" es un error de
// Postgres que sabemos traducir, o null si no lo es (en ese caso,
// errorHandler.js sigue su camino normal y responde 500).
function mapearErrorPostgres(error) {
  switch (error.code) {
    case "23505": // unique_violation
      return {
        status: 409,
        publicMessage: MENSAJES_UNIQUE[error.constraint] || "Ese registro ya existe",
      };
    case "23503": // foreign_key_violation
      return {
        status: 404,
        publicMessage: "El recurso relacionado no existe",
      };
    case "23514": // check_violation
      return {
        status: 400,
        publicMessage: "Los datos no cumplen las reglas permitidas",
      };
    case "22P02": // invalid_text_representation (uuid/numero con formato invalido)
      return {
        status: 400,
        publicMessage: "Alguno de los identificadores tiene un formato inválido",
      };
    case "22007": // invalid_datetime_format
      return {
        status: 400,
        publicMessage: "Alguna de las fechas tiene un formato inválido",
      };
    default:
      return null; // no es un error de Postgres reconocido, que siga siendo 500
  }
}

module.exports = { mapearErrorPostgres };
