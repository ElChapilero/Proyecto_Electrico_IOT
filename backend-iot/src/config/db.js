// Importar componentes
const { Pool } = require("pg"); // conectar con PostgreSQL
require("dotenv").config(); // cargar variables del archivo .env

// configuración de la base de datos
const { databaseUrl, statementTimeoutMs } = require("./env");

// Configurar conexión a PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,  // dirección de la base de datos
  statement_timeout: statementTimeoutMs,
}); 

// Manejar errores de conexión
pool.on("error", (err) => {
  console.error("❌ Error inesperado en el pool de Postgres:", err.message);
});

module.exports = pool; // Permite usar en otros archivos
