// authMiddleware.js
// Importar componentes
const jwt = require("jsonwebtoken"); // crear, firmar y verificar tokens JWT
const { jwtSecret } = require("../config/env");
const { findPasswordChangedAt } = require("../modules/auth/auth.repository");

// Verificar autenticación del usuario
async function requiereAuth(req, res, next) {
  const header = req.headers.authorization || "";
  // Ejemplo : Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Falta el token de autenticacion" });
  }

  try {
    req.usuario = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }); // { id, email, iat }
  } catch (err) {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }

  try {
    const passwordChangedAt = await findPasswordChangedAt(req.usuario.id);
    const changedAtSeconds = passwordChangedAt
      ? Math.floor(new Date(passwordChangedAt).getTime() / 1000)
      : null;

    if (changedAtSeconds && req.usuario.iat < changedAtSeconds) {
      return res.status(401).json({ error: "La sesión expiró. Inicia sesión nuevamente" });
    }
  } catch (err) {
    return next(err);
  }

  next();
}

module.exports = { requiereAuth }; // permitir usar otros archivos
