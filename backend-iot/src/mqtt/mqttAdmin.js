// Ejecuta comandos de Docker y gestiona archivos de configuración.
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { esUuidEsp32Valido } = require("../utils/mqttIdentifiers");

// Define las rutas de los archivos y el nombre del contenedor MQTT.
const PASSWD_FILE =
  process.env.MQTT_PASSWD_FILE ||
  path.join(__dirname, "../../../mqtt-broker-local/config/passwd");

const ACL_FILE =
  process.env.MQTT_ACL_FILE ||
  path.join(__dirname, "../../../mqtt-broker-local/config/acl.conf");

const MOSQUITTO_CONTAINER =
  process.env.MOSQUITTO_CONTAINER_NAME || "mqtt-broker-local";

// Ruta del archivo de contraseñas dentro del contenedor.
const RUTA_PASSWD_CONTENEDOR = "/mosquitto/config/passwd"; // ruta DENTRO del contenedor

// Crea un usuario MQTT y le asigna permisos de acceso.
function agregarUsuarioMqtt(username, password) {
  return new Promise((resolve, reject) => {
    if (!esUuidEsp32Valido(username)) {
      return reject(
        new Error(`uuid_esp32 con formato invalido: "${username}"`),
      );
    }

    // Comprueba si ya existe el archivo de contraseñas.
    const archivoExiste = fs.existsSync(PASSWD_FILE);

    // Prepara el comando para crear o actualizar el usuario en Mosquitto.
    const args = archivoExiste
      ? [
          "exec",
          MOSQUITTO_CONTAINER,
          "mosquitto_passwd",
          "-b",
          RUTA_PASSWD_CONTENEDOR,
          username,
          password,
        ]
      : [
          "exec",
          MOSQUITTO_CONTAINER,
          "mosquitto_passwd",
          "-b",
          "-c",
          RUTA_PASSWD_CONTENEDOR,
          username,
          password,
        ];

    // Ejecuta el comando dentro del contenedor MQTT.
    execFile("docker", args, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(
            `No se pudo crear el usuario MQTT (¿esta corriendo el contenedor ${MOSQUITTO_CONTAINER}?): ` +
              `${stderr || error.message}`,
          ),
        );
      }

      try {
        // Agrega los permisos del usuario al archivo ACL.
        agregarBloqueAcl(username);
      } catch (e) {
        return reject(e);
      }
      // Recarga Mosquitto para aplicar los cambios.
      recargarMosquitto().then(resolve).catch(reject);
    });
  });
}

// Agrega las reglas ACL para que el dispositivo acceda a su propio topic.
function agregarBloqueAcl(username) {
  const yaExiste =
    fs.existsSync(ACL_FILE) &&
    fs.readFileSync(ACL_FILE, "utf8").includes(`user ${username}\n`);

  if (yaExiste) return; // reintento de registro del mismo dispositivo

  const bloque = `\nuser ${username}\ntopic readwrite casa/${username}/#\n`;
  fs.appendFileSync(ACL_FILE, bloque);
}

// Envía una señal a Mosquitto para que recargue su configuración.
function recargarMosquitto() {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      ["exec", MOSQUITTO_CONTAINER, "kill", "-SIGHUP", "1"],
      (error) => {
        if (error) return reject(error);
        resolve();
      },
    );
  });
}

// Elimina un usuario MQTT y sus permisos.
function eliminarUsuarioMqtt(username) {
  return new Promise((resolve, reject) => {
    if (!esUuidEsp32Valido(username))
      return reject(new Error("uuid_esp32 con formato invalido"));
    execFile(
      "docker",
      [
        "exec",
        MOSQUITTO_CONTAINER,
        "mosquitto_passwd",
        "-D",
        RUTA_PASSWD_CONTENEDOR,
        username,
      ],
      (error, stdout, stderr) => {
        if (error)
          return reject(
            new Error(
              `No se pudo eliminar el usuario MQTT: ${stderr || error.message}`,
            ),
          );
        try {
          eliminarBloqueAcl(username);
        } catch (e) {
          return reject(e);
        }
        recargarMosquitto().then(resolve).catch(reject);
      },
    );
  });
}

// Elimina del archivo ACL las reglas del usuario indicado.
function eliminarBloqueAcl(username) {
  if (!fs.existsSync(ACL_FILE)) return;
  const bloque = `\nuser ${username}\ntopic readwrite casa/${username}/#\n`;
  const contenido = fs.readFileSync(ACL_FILE, "utf8");
  fs.writeFileSync(ACL_FILE, contenido.replace(bloque, "\n"));
}

module.exports = { agregarUsuarioMqtt, eliminarUsuarioMqtt };
