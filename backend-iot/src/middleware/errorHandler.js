// Importar componentes
const { mapearErrorPostgres } = require("../utils/pgErrorMapper"); // adaptar errores de PostgreSQL

// Manejar errores del servidor
function errorHandler(error, _req, res, _next) {

  // Detectar errores por JSON inválido
  if (error &&(error.type === "entity.parse.failed" ||
      (error instanceof SyntaxError && error.status === 400))
  ) {
    console.error("HTTP error", { type: "invalid_json", status: 400 });
    return res.status(400).json({ error: "El body debe contener JSON válido" });
  }

  const mapeado = !error.status ? mapearErrorPostgres(error) : null; // convertir error de base de datos a respuesta conocida
  console.error("HTTP error", {
    status: error.status || mapeado?.status || 500,
    code: error.code || mapeado?.code || undefined,
    type: error.type || error.name || "Error",
  });

  // Responder errores de PostgreSQL
  if (!error.status) {
    if (mapeado) {
      return res.status(mapeado.status).json({ error: mapeado.publicMessage });
    }
  }

  res
    .status(error.status || 500)
    .json({ error: error.publicMessage || "Error interno" });
}

module.exports = errorHandler; // permitir usar en otros archivos
