const bcrypt = require("bcryptjs");
const repo = require("./usuarios.repository"); // Importa las consultas a la base de datos
const { normalizarEmail } = require("../auth/auth.service");
const {
  MAX_NAME_LENGTH,
  validateEmail,
  validatePasswordStrength,
} = require("../auth/auth.validator"); // Importa las reglas de validación

// Crea un error con su código HTTP
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });

// Obtiene los datos del usuario por su ID
async function getMe(id) {
  const u = await repo.findById(id);
  if (!u) throw error(404, "Usuario no encontrado");
  return u;
}

// Actualiza los datos permitidos del usuario
async function updateMe(id, data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");

  const payload = { ...data }; // Crea una copia de los datos recibidos

  // comprueba que sea válido
  if (payload.email !== undefined) {
    if (validateEmail(payload.email) !== true)
      throw error(400, "email inválido");

    payload.email = normalizarEmail(payload.email);
  }

  // Si se quiere actualizar el nombre, comprueba su tipo y longitud
  if (
    payload.nombre !== undefined &&
    (typeof payload.nombre !== "string" ||
      payload.nombre.trim().length < 2 ||
      payload.nombre.trim().length > MAX_NAME_LENGTH)
  )
    throw error(400, "nombre inválido");

  // Rechaza solicitudes que no incluyan correo ni nombre
  if (payload.email === undefined && payload.nombre === undefined)
    throw error(400, "No hay campos válidos para actualizar");

  const updated = await repo.update(id, payload); // Solicita guardar los cambios

  if (!updated) throw error(404, "Usuario no encontrado");
  return updated;
}

async function changePassword(id, data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw error(400, "El body debe ser un objeto");

  const { currentPassword, newPassword } = data;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword)
    throw error(400, "La contraseña actual y la nueva son obligatorias");

  const passwordResult = validatePasswordStrength(newPassword);
  if (passwordResult !== true) throw error(400, passwordResult);

  const credentials = await repo.findPasswordHash(id);
  if (!credentials || !(await bcrypt.compare(currentPassword, credentials.password_hash)))
    throw error(401, "La contraseña actual no es correcta");

  if (currentPassword === newPassword)
    throw error(400, "La nueva contraseña debe ser diferente");

  if (newPassword.trim().toLowerCase() === String(credentials.email).trim().toLowerCase())
    throw error(400, "La contraseña no puede ser igual al email");

  const newHash = await bcrypt.hash(newPassword, 12);
  const updated = await repo.updatePasswordHash(id, newHash);
  if (!updated) throw error(404, "Usuario no encontrado");

  return { message: "Contraseña actualizada. Inicia sesión nuevamente" };
}

module.exports = { getMe, updateMe, changePassword };
