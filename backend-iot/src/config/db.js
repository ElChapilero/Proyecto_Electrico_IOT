// db.js
// Pool de conexion a PostgreSQL (el mismo que usan las rutas y el

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si preferis variables sueltas en vez de connectionString, comenta
  // la linea de arriba y descomenta estas:
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
