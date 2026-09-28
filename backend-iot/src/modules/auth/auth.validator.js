const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;
const MAX_NAME_LENGTH = 100;
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "contraseña",
  "contrasena",
  "contraseña123",
  "contrasena123",
  "123456",
  "admin123",
  "bienvenido",
  "hola123",
]);

function normalizeEmailForValidation(email) {
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  if (typeof email !== "string") return "email debe ser texto";
  const value = normalizeEmailForValidation(email);
  if (!value || value.length > MAX_EMAIL_LENGTH) return "email inválido";
  if (/\s/.test(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email inválido";
  return true;
}

function validateCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim() || !body.password)
    return "email y password son obligatorios";
  const emailResult = validateEmail(body.email);
  if (emailResult !== true) return emailResult;
  if (Buffer.byteLength(body.password, "utf8") > MAX_PASSWORD_LENGTH)
    return "password no puede superar 72 bytes";
  return true;
}

function validatePasswordStrength(password) {
  const value = String(password);
  if (value.length < 10) return "password debe tener al menos 10 caracteres";
  if (value.length > MAX_PASSWORD_LENGTH || Buffer.byteLength(value, "utf8") > MAX_PASSWORD_LENGTH)
    return "password no puede superar 72 caracteres o bytes UTF-8";
  if (!/\p{Lu}/u.test(value)) return "password debe incluir una mayúscula";
  if (!/\p{Ll}/u.test(value)) return "password debe incluir una minúscula";
  if (!/\p{N}/u.test(value)) return "password debe incluir un número";
  if (!/[^\p{L}\p{N}\s]/u.test(value)) return "password debe incluir un símbolo";
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return "password demasiado común";
  return true;
}

function validateRegistration(body) {
  const result = validateCredentials(body);
  if (result !== true) return result;
  const passwordResult = validatePasswordStrength(body.password);
  if (passwordResult !== true) return passwordResult;
  if (body.password.toLowerCase() === normalizeEmailForValidation(body.email))
    return "password no puede ser igual al email";
  if (typeof body.nombre !== "string" || body.nombre.trim().length < 2 || body.nombre.trim().length > MAX_NAME_LENGTH)
    return "nombre inválido";
  return true;
}

module.exports = {
  validateCredentials,
  validateRegistration,
  validatePasswordStrength,
  validateEmail,
  MAX_NAME_LENGTH,
};
