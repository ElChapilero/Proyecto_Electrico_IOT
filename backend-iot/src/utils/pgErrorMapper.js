// Mensajes para errores de datos duplicados
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

// Convertir errores de PostgreSQL en respuestas HTTP
function mapearErrorPostgres(error) {
  switch (error.code) { // revisa el código del error
    case "23505": // error por dato duplicado
      return {
        status: 409, // indicar conflicto con un dato existente
        publicMessage: MENSAJES_UNIQUE[error.constraint] || "Ese registro ya existe",
      };
    case "23503": // error por clave foránea
      return {
        status: 404, // indicar que el recurso relacionado no existe
        publicMessage: "El recurso relacionado no existe",
      };
    case "23514":// error por regla CHECK
      return {
        status: 400, //datos incorrectos
        publicMessage: "Los datos no cumplen las reglas permitidas",
      };
    case "22P02": // error por formato de texto inválido
      return {
        status: 400,
        publicMessage: "Alguno de los identificadores tiene un formato inválido",
      };
    case "22007": // error por formato de fecha inválido
      return {
        status: 400,
        publicMessage: "Alguna de las fechas tiene un formato inválido",
      };
    default:
      return null; // no es un error de Postgres reconocido, que siga siendo 500
  }
}

module.exports = { mapearErrorPostgres }; // permitir usarlo en otros archivos
