const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repository = require("./auth.repository");
const { jwtSecret } = require("../../config/env");

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: "24h",
  });
}

// (Fix bug menor 6.1) 
function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

async function register({ email, nombre, password }) {
  const emailNormalizado = normalizarEmail(email);
  const existing = await repository.findByEmail(emailNormalizado);
  if (existing)
    throw Object.assign(new Error("Ya existe una cuenta con ese correo"), {
      status: 409,
      publicMessage: "Ya existe una cuenta con ese correo",
    });
  const passwordHash = await bcrypt.hash(password, 10);
  const account = await repository.createAccount({
    email: emailNormalizado,
    nombre: nombre.trim(),
    passwordHash,
  });
  return {
    token: tokenFor(account.user),
    usuario: account.user,
    predio: { ...account.property, rol: "administrador" },
    panel: account.panel,
  };
}

async function login({ email, password }) {
  const user = await repository.findByEmail(normalizarEmail(email));
  const dummyPasswordHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const passwordCorrecta = await bcrypt.compare(password, user?.password_hash || dummyPasswordHash);
  if (!user || !passwordCorrecta) {
    throw Object.assign(new Error("Correo o contraseña incorrectos"), {
      status: 401,
      publicMessage: "Correo o contraseña incorrectos",
    });
  }
  return {
    token: tokenFor(user),
    usuario: { id: user.id, email: user.email, nombre: user.nombre },
  };
}

module.exports = { register, login, normalizarEmail };
