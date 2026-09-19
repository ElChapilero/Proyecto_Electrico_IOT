// accesos.routes.js

const express = require('express');
const router = express.Router();

const pool = require('../../config/db');
const { requiereAuth } = require('../../middleware/authMiddleware');
const { esAdministrador } = require('../../utils/accesoHelpers');

const ROLES_VALIDOS = ['administrador', 'lector'];

// PROTEGIDA: lista quien tiene acceso a un predio. Solo lo puede
// pedir un administrador de ese predio.
router.get('/', requiereAuth, async (req, res) => {
  const { id_predio } = req.query;
  if (!id_predio) return res.status(400).json({ error: 'Falta id_predio' });

  try {
    if (!(await esAdministrador(id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    const accesos = await pool.query(
      `SELECT ac.id, ac.id_usuario, u.email, u.nombre, ac.rol, ac.creado_en
       FROM accesos_predio ac
       JOIN usuarios u ON u.id = ac.id_usuario
       WHERE ac.id_predio = $1
       ORDER BY ac.creado_en ASC`,
      [id_predio]
    );
    res.json(accesos.rows);
  } catch (err) {
    console.error('Error listando accesos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: comparte un predio con otro usuario ya registrado
// (por email). Solo lo puede hacer un administrador de ese predio.
router.post('/', requiereAuth, async (req, res) => {
  const { id_predio, email, rol } = req.body || {};

  if (!id_predio || !email) {
    return res.status(400).json({ error: 'Faltan id_predio o email' });
  }

  const rolFinal = rol || 'lector';
  if (!ROLES_VALIDOS.includes(rolFinal)) {
    return res.status(400).json({ error: `rol invalido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });
  }

  try {
    if (!(await esAdministrador(id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    const usuario = await pool.query('SELECT id, email, nombre FROM usuarios WHERE email = $1', [email]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'No existe ningún usuario registrado con ese correo' });
    }

    const nuevo = await pool.query(
      `INSERT INTO accesos_predio (id_predio, id_usuario, rol)
       VALUES ($1, $2, $3)
       RETURNING id, id_usuario, rol, creado_en`,
      [id_predio, usuario.rows[0].id, rolFinal]
    );

    res.status(201).json({
      ...nuevo.rows[0],
      email: usuario.rows[0].email,
      nombre: usuario.rows[0].nombre,
    });
  } catch (err) {
    if (err.code === '23505') {

      return res.status(409).json({ error: 'Ese usuario ya tiene acceso a este predio' });
    }
    console.error('Error compartiendo predio:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: cambia el rol de un usuario en un predio. No deja que el predio se quede sin administrador.
router.patch('/:idUsuario', requiereAuth, async (req, res) => {
  const { id_predio, rol } = req.body || {};

  if (!id_predio || !rol) {
    return res.status(400).json({ error: 'Faltan id_predio o rol' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `rol invalido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });
  }

  try {
    if (!(await esAdministrador(id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    if (rol === 'lector') {
      const otrosAdmins = await pool.query(
        `SELECT COUNT(*) FROM accesos_predio
         WHERE id_predio = $1 AND rol = 'administrador' AND id_usuario != $2`,
        [id_predio, req.params.idUsuario]
      );
      if (Number(otrosAdmins.rows[0].count) === 0) {
        return res.status(409).json({ error: 'El predio necesita al menos un administrador' });
      }
    }

    const actualizado = await pool.query(
      `UPDATE accesos_predio SET rol = $1 WHERE id_predio = $2 AND id_usuario = $3
       RETURNING id, id_usuario, rol, creado_en`,
      [rol, id_predio, req.params.idUsuario]
    );

    if (actualizado.rows.length === 0) {
      return res.status(404).json({ error: 'Ese usuario no tiene acceso a este predio' });
    }

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error actualizando acceso:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PROTEGIDA: revoca el acceso de un usuario a un predio. Mismo
// resguardo: no se puede sacar al último administrador.

router.delete('/:idUsuario', requiereAuth, async (req, res) => {
  const { id_predio } = req.query;
  if (!id_predio) return res.status(400).json({ error: 'Falta id_predio' });

  try {
    if (!(await esAdministrador(id_predio, req.usuario.id))) {
      return res.status(403).json({ error: 'No sos administrador de ese predio' });
    }

    const objetivo = await pool.query(
      'SELECT rol FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2',
      [id_predio, req.params.idUsuario]
    );

    if (objetivo.rows[0]?.rol === 'administrador') {
      const otrosAdmins = await pool.query(
        `SELECT COUNT(*) FROM accesos_predio
         WHERE id_predio = $1 AND rol = 'administrador' AND id_usuario != $2`,
        [id_predio, req.params.idUsuario]
      );
      if (Number(otrosAdmins.rows[0].count) === 0) {
        return res.status(409).json({ error: 'El predio necesita al menos un administrador' });
      }
    }

    const borrado = await pool.query(
      'DELETE FROM accesos_predio WHERE id_predio = $1 AND id_usuario = $2 RETURNING id',
      [id_predio, req.params.idUsuario]
    );

    if (borrado.rows.length === 0) {
      return res.status(404).json({ error: 'Ese usuario no tiene acceso a este predio' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error revocando acceso:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
