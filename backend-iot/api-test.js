const assert = require("node:assert/strict");

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch (_) {}
  return { response, body };
}

async function main() {
  const publicInvalid = await request("/api/v1/dispositivos/registrar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(
    publicInvalid.response.status,
    400,
    "el registro público debe validar el body sin pedir JWT",
  );

  const protectedResponse = await request("/api/v1/predios");
  assert.equal(
    protectedResponse.response.status,
    401,
    "una ruta protegida no debe aceptar solicitudes anónimas",
  );

  const publicInvalidCode = await request("/api/v1/dispositivos/registrar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uuid_esp32: "esp32-test", codigo: "000000" }),
  });
  assert.equal(
    publicInvalidCode.response.status,
    404,
    "un código inexistente debe devolver 404",
  );

  console.log("API smoke tests: OK");
  console.log(
    "Pruebas destructivas/con datos reales omitidas: define TEST_VALID_CODE y TEST_DEVICE_UUID solo en un entorno de pruebas.",
  );
}

main().catch((error) => {
  console.error("API smoke tests: FAILED");
  console.error(error.message);
  process.exitCode = 1;
});
