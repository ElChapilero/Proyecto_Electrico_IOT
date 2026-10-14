const bcrypt = require("bcryptjs"); // Permite cifrar contraseñas mediante hashes
const jwt = require("jsonwebtoken"); // Permite crear tokens de autenticación

// Importes
const repository = require("./auth.repository");
const { jwtSecret } = require("../../config/env");

// Genera un token para identificar al usuario durante la autenticación
function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: "24h",
  });
}

// Normaliza el correo
function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

// Registra una cuenta nueva
async function register({ email, nombre, password }) {
  const emailNormalizado = normalizarEmail(email);

  const existing = await repository.findByEmail(emailNormalizado); // Comprueba si ya existe

  // Si el correo ya está registrado, devuelve un error 409
  if (existing)
    throw Object.assign(new Error("Ya existe una cuenta con ese correo"), {
      status: 409,
      publicMessage: "Ya existe una cuenta con ese correo",
    });

  const passwordHash = await bcrypt.hash(password, 10); // Genera el hash de la contraseña
  
  // Crea la cuenta y los datos relacionados en la base de datos
  const account = await repository.createAccount({
    email: emailNormalizado,
    nombre: nombre.trim(),
    passwordHash,
  });

  // Devuelve los datos necesarios para iniciar la sesión
  return {
    token: tokenFor(account.user),
    usuario: account.user,
    predio: { ...account.property, rol: "administrador" },
    panel: account.panel,
  };
}

// Inicia sesión con el correo y la contraseña
async function login({ email, password }) {

  // Busca al usuario usando el correo
  const user = await repository.findByEmail(normalizarEmail(email));

  // Hash de referencia para realizar una comparación si el usuario no existe
  const dummyPasswordHash =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  
  // Compara la contraseña recibida con el hash del usuario o el hash de referencia
  const passwordCorrecta = await bcrypt.compare(
    password,
    user?.password_hash || dummyPasswordHash,
  );
  
  // rechaza el acceso
  if (!user || !passwordCorrecta) {
    throw Object.assign(new Error("Correo o contraseña incorrectos"), {
      status: 401,
      publicMessage: "Correo o contraseña incorrectos",
    });
  }

  // Devuelve el token y los datos básicos del usuario
  return {
    token: tokenFor(user),
    usuario: { id: user.id, email: user.email, nombre: user.nombre },
  };
}

module.exports = { register, login, normalizarEmail };
