// circuitos.routes.js

const express = require('express');
const router = express.Router();

const pool = require('../../config/db');
const { requiereAuth } = require('../../middleware/authMiddleware');
const { esAdministrador } = require('../../utils/accesoHelpers');

// PROTEGIDA: lista los circuitos de los predios a los que el
// usuario tiene acceso (administrador O lector). Con
// ?id_dispositivo= filtra a los de un solo dispositivo.
router.get('/', requiereAuth, async (req, res) => {
  const { id_dispositivo } = req.query;

  try {
    const params = [req.usuario.id];
    let filtro = '';

    if (id_dispositivo) {
      filtro = 'AND c.id_dispositivo = $2';
      params.push(id_dispositivo);
    }

    const circuitos = await pool.query(
      `SELECT c.id, c.id_dispositivo, c.nombre, c.estado, c.indice, c.creado_en
       FROM circuitos c
       JOIN dispositivos d ON d.id = c.id_dispositivo
       JOIN paneles_electricos pa ON pa.id = d.id_panel
       JOIN accesos_predio ac ON ac.id_predio = pa.id_predio
       WHERE ac.id_usuario = $1 ${filtro}
       ORDER BY c.indice ASC`,
      params
    );
    res.json(circuitos.rows);
  } catch (err) {
    console.error('Error listando circuitos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: renombra un circuito. Solo administrador del predio.
router.patch('/:id', requiereAuth, async (req, res) => {
  const { nombre } = req.body || {};

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'Falta el nombre' });
  }

  try {
    const circuito = await pool.query(
      `SELECT pa.id_predio
       FROM circuitos c
       JOIN dispositivos d ON d.id = c.id_dispositivo
       JOIN paneles_electricos pa ON pa.id = d.id_panel
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (circuito.rows.length === 0) {
      return res.status(404).json({ error: 'Circuito no encontrado' });
    }
    if (!(await esAdministrador(circuito.rows[0].id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de este predio' });
    }

    const actualizado = await pool.query(
      `UPDATE circuitos SET nombre = $1 WHERE id = $2
       RETURNING id, id_dispositivo, nombre, estado, indice, creado_en`,
      [nombre.trim(), req.params.id]
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error actualizando circuito:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
