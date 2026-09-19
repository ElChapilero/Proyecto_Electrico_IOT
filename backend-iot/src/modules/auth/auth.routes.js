// auth.routes.js
// Registro / login con bcrypt + JWT. Montar en server.js como:
//   app.use('/api/auth', require('./auth.routes'));

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const pool = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIAR_ESTO_EN_.ENV';
const JWT_EXPIRA = '7d';

const NOMBRE_PREDIO_POR_DEFECTO = 'Mi predio';
const TIPO_PREDIO_POR_DEFECTO = 'Casa';
const NOMBRE_PANEL_POR_DEFECTO = 'Principal';
const TIPO_PANEL_POR_DEFECTO = 'Principal';

router.post('/registro', async (req, res) => {
  const { email, nombre, password } = req.body || {};

  if (!email || !nombre || !password) {
    return res.status(400).json({ error: 'Faltan email, nombre o password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La password tiene que tener al menos 6 caracteres' });
  }

  // Client dedicado: creamos usuario + predio por defecto + acceso
  // de administrador sobre ese predio + panel Principal por
  // defecto, todo en UNA transaccion.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existente = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const hash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await client.query(
      'INSERT INTO usuarios (email, nombre, password_hash) VALUES ($1, $2, $3) RETURNING id, email, nombre',
      [email, nombre, hash]
    );
    const usuario = nuevoUsuario.rows[0];

    // Predio por defecto. Ya no lleva id_usuario propio: la
    // relacion con el usuario pasa entera por accesos_predio.
    const nuevoPredio = await client.query(
      'INSERT INTO predios (nombre, tipo_predio) VALUES ($1, $2) RETURNING id, nombre, tipo_predio, creado_en',
      [NOMBRE_PREDIO_POR_DEFECTO, TIPO_PREDIO_POR_DEFECTO]
    );
    const predio = nuevoPredio.rows[0];

    // El usuario que se acaba de registrar queda como administrador
    // de su propio predio por defecto.
    await client.query(
      `INSERT INTO accesos_predio (id_predio, id_usuario, rol) VALUES ($1, $2, 'administrador')`,
      [predio.id, usuario.id]
    );

    // Panel Principal por defecto, dentro de ese predio, para que
    // el usuario ya tenga a donde vincular su primer ESP32.
    const nuevoPanel = await client.query(
      'INSERT INTO paneles_electricos (id_predio, nombre, tipo_panel) VALUES ($1, $2, $3) RETURNING id, id_predio, id_panel_principal, nombre, tipo_panel, creado_en',
      [predio.id, NOMBRE_PANEL_POR_DEFECTO, TIPO_PANEL_POR_DEFECTO]
    );
    const panel = nuevoPanel.rows[0];

    await client.query('COMMIT');

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: JWT_EXPIRA });

    res.json({ token, usuario, predio: { ...predio, rol: 'administrador' }, panel });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan email o password' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, email, nombre, password_hash FROM usuarios WHERE email = $1',
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const usuario = resultado.rows[0];
    const coincide = await bcrypt.compare(password, usuario.password_hash || '');

    if (!coincide) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: JWT_EXPIRA });

    res.json({
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
