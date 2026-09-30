// db.js
// Pool de conexion a PostgreSQL (el mismo que usan las rutas y el

const { Pool } = require('pg');
require('dotenv').config();
const { databaseUrl, statementTimeoutMs } = require('./env');

const pool = new Pool({
  connectionString: databaseUrl,
  statement_timeout: statementTimeoutMs,
  // Si  se prefiere variables sueltas en vez de connectionString, comentar
  // la linea de arriba y descomentar estas:
  // host: process.env.PGHOST,
  // port: process.env.PGPORT || 5432,
  // user: process.env.PGUSER,
  // password: process.env.PGPASSWORD,
  // database: process.env.PGDATABASE,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de Postgres:', err.message);
});

module.exports = pool;
