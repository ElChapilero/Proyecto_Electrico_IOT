// predios.routes.js

const express = require('express');
const router = express.Router();

const pool = require('../../config/db');
const { requiereAuth } = require('../../middleware/authMiddleware');
const { esAdministrador } = require('../../utils/accesoHelpers');

const TIPOS_PREDIO_VALIDOS = ['Casa'];

router.post('/', requiereAuth, async (req, res) => {
  const { nombre, tipo_predio } = req.body || {};

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta el nombre del predio' });
  }

  const tipo = tipo_predio || 'Casa';
  if (!TIPOS_PREDIO_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      error: `tipo_predio invalido. Valores permitidos: ${TIPOS_PREDIO_VALIDOS.join(', ')}`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const nuevo = await client.query(
      'INSERT INTO predios (nombre, tipo_predio) VALUES ($1, $2) RETURNING id, nombre, tipo_predio, creado_en',
      [nombre.trim(), tipo]
    );

    await client.query(
      `INSERT INTO accesos_predio (id_predio, id_usuario, rol) VALUES ($1, $2, 'administrador')`,
      [nuevo.rows[0].id, req.usuario.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...nuevo.rows[0], rol: 'administrador' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando predio:', err);
    res.status(500).json({ error: 'Error interno creando el predio' });
  } finally {
    client.release();
  }
});

// PROTEGIDA: lista los predios a los que el usuario tiene acceso(propios o compartidos con el)
router.get('/', requiereAuth, async (req, res) => {
  try {
    const predios = await pool.query(
      `SELECT p.id, p.nombre, p.tipo_predio, p.creado_en, ac.rol
       FROM predios p
       JOIN accesos_predio ac ON ac.id_predio = p.id
       WHERE ac.id_usuario = $1
       ORDER BY p.creado_en ASC`,
      [req.usuario.id]
    );
    res.json(predios.rows);
  } catch (err) {
    console.error('Error listando predios:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: renombra un predio o le cambia el tipo. Solo un administrador de ese predio puede hacerlo (un lector NO).
router.patch('/:id', requiereAuth, async (req, res) => {
  const { nombre, tipo_predio } = req.body || {};

  if (!nombre && !tipo_predio) {
    return res.status(400).json({ error: 'Nada para actualizar (nombre o tipo_predio)' });
  }
  if (tipo_predio && !TIPOS_PREDIO_VALIDOS.includes(tipo_predio)) {
    return res.status(400).json({
      error: `tipo_predio invalido. Valores permitidos: ${TIPOS_PREDIO_VALIDOS.join(', ')}`,
    });
  }

  try {
    if (!(await esAdministrador(req.params.id, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de este predio' });
    }

    const actual = await pool.query('SELECT nombre, tipo_predio FROM predios WHERE id = $1', [req.params.id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    const nuevoNombre = nombre ? nombre.trim() : actual.rows[0].nombre;
    const nuevoTipo = tipo_predio || actual.rows[0].tipo_predio;

    const actualizado = await pool.query(
      'UPDATE predios SET nombre = $1, tipo_predio = $2 WHERE id = $3 RETURNING id, nombre, tipo_predio, creado_en',
      [nuevoNombre, nuevoTipo, req.params.id]
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error actualizando predio:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: borra un predio. Solo un administrador puede hacerlo. Por el ON DELETE CASCADE del esquema, esto se lleva puestos accesos_predio, paneles, dispositivos, circuitos y mediciones.
router.delete('/:id', requiereAuth, async (req, res) => {
  try {
    if (!(await esAdministrador(req.params.id, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de este predio' });
    }

    const borrado = await pool.query('DELETE FROM predios WHERE id = $1 RETURNING id', [req.params.id]);
    if (borrado.rows.length === 0) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error borrando predio:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
