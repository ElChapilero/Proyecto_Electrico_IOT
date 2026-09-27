function validateCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim() || !body.password)
    return "email y password son obligatorios";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return "email inválido";
  return true;
}

// (Fix bug menor 2.6) 
function validatePasswordStrength(password) {
  const value = String(password);
  if (value.length < 8) return "password debe tener al menos 8 caracteres";
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value))
    return "password debe incluir al menos una letra y un número";
  return true;
}

function validateRegistration(body) {
  const result = validateCredentials(body);
  if (result !== true) return result;
  const passwordResult = validatePasswordStrength(body.password);
  if (passwordResult !== true) return passwordResult;
  if (typeof body.nombre !== "string" || body.nombre.trim().length < 2)
    return "nombre inválido";
  return true;
}

module.exports = { validateCredentials, validateRegistration, validatePasswordStrength };
