// authMiddleware.js
// Importar componentes
const jwt = require("jsonwebtoken"); // crear, firmar y verificar tokens JWT
const { jwtSecret } = require("../config/env");

// Verificar autenticación del usuario
function requiereAuth(req, res, next) {
  const header = req.headers.authorization || "";
  // Ejemplo : Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Falta el token de autenticacion" });
  }

  try {
    req.usuario = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }); // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

module.exports = { requiereAuth }; // permitir usar otros archivos
