const repo = require("./accesos.repository"); // Consultan y modifican los accesos

const { esAdministrador } = require("../../utils/accesoHelpers"); // Comprueba si un usuario es administrador

// Crea un error con su código HTTP
const error = (status, message) =>
  Object.assign(new Error(message), { status, publicMessage: message });

// Roles permitidos
const roles = ["administrador", "lector"];

// Comprueba que el usuario que realiza la operación sea administrador
async function authorize(predioId, userId) {
  if (!(await esAdministrador(predioId, userId)))
    throw error(403, "Se requiere ser administrador del predio");
}

// Obtiene los accesos de un predio, solo si el usuario es administrador
async function list(predioId, userId) {
  await authorize(predioId, userId);
  return repo.list(predioId);
}

// Añade un usuario a los accesos de un predio
async function add(predioId, userId, data) {
  await authorize(predioId, userId);
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
  )
    throw error(400, "Email inválido");

  const role = data.rol || "lector";

  // Comprueba que el rol solicitado esté permitido
  if (!roles.includes(role)) throw error(400, "rol inválido");

  // Busca al usuario por su correo
  const target = await repo.findUserByEmail(data.email.trim().toLowerCase());

  if (!target) throw error(404, "Usuario no encontrado");

  try {
    // Registra el acceso del usuario al predio con el rol
    return await repo.add(predioId, target.id, role);
  } catch (e) {
    if (e.code === "23505") throw error(409, "Ese usuario ya tiene acceso");
    throw e;
  }
}

// Cambia el rol de un usuario dentro de un predio
async function update(predioId, targetId, userId, role) {
  await authorize(predioId, userId);

  if (!roles.includes(role)) throw error(400, "rol inválido");

  try {
    return await repo.updateRoleSafely(predioId, targetId, role, userId);
  } catch (e) {
    if (e.code === "NOT_ADMIN")
      throw error(403, "Se requiere ser administrador del predio");
    if (e.code === "ACCESS_NOT_FOUND") throw error(404, "Acceso no encontrado");
    if (e.code === "LAST_ADMIN")
      throw error(409, "El predio necesita al menos un administrador");
    throw e;
  }
}

// Elimina el acceso de un usuario a un predio
async function remove(predioId, targetId, userId) {
  await authorize(predioId, userId);
  try {
    await repo.removeSafely(predioId, targetId, userId);
  } catch (e) {
    if (e.code === "NOT_ADMIN")
      throw error(403, "Se requiere ser administrador del predio");
    if (e.code === "ACCESS_NOT_FOUND") throw error(404, "Acceso no encontrado");
    if (e.code === "LAST_ADMIN")
      throw error(409, "El predio necesita al menos un administrador");
    throw e;
  }
}

module.exports = { list, add, update, remove };
