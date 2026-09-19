// mqttAdmin.js

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PASSWD_FILE = process.env.MQTT_PASSWD_FILE ||
  path.join(__dirname, '../../../mqtt-broker-local/config/passwd');
const ACL_FILE = process.env.MQTT_ACL_FILE ||
  path.join(__dirname, '../../../mqtt-broker-local/config/acl.conf');
// Coincide con el "container_name" del docker-compose.yml del broker.
const MOSQUITTO_CONTAINER = process.env.MOSQUITTO_CONTAINER_NAME || 'mqtt-broker-local';

const RUTA_PASSWD_CONTENEDOR = '/mosquitto/config/passwd'; // ruta DENTRO del contenedor

/** Crea (o actualiza) un usuario MQTT para un dispositivo y le agrega su regla de ACL.*/
function agregarUsuarioMqtt(username, password) {
  return new Promise((resolve, reject) => {
    const archivoExiste = fs.existsSync(PASSWD_FILE); // chequeo por el volumen compartido

    const args = archivoExiste
      ? ['exec', MOSQUITTO_CONTAINER, 'mosquitto_passwd', '-b', RUTA_PASSWD_CONTENEDOR, username, password]
      : ['exec', MOSQUITTO_CONTAINER, 'mosquitto_passwd', '-b', '-c', RUTA_PASSWD_CONTENEDOR, username, password];

    execFile('docker', args, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(
          `No se pudo crear el usuario MQTT (¿esta corriendo el contenedor ${MOSQUITTO_CONTAINER}?): ` +
          `${stderr || error.message}`
        ));
      }

      try {
        agregarBloqueAcl(username);
      } catch (e) {
        return reject(e);
      }

      recargarMosquitto()
        .catch(e => console.warn(
          '⚠ Usuario MQTT creado, pero no se pudo recargar Mosquitto automaticamente:',
          e.message
        ))
        .finally(resolve);
    });
  });
}

function agregarBloqueAcl(username) {
  const yaExiste = fs.existsSync(ACL_FILE) &&
    fs.readFileSync(ACL_FILE, 'utf8').includes(`user ${username}\n`);

  if (yaExiste) return; // reintento de registro del mismo dispositivo

  const bloque = `\nuser ${username}\ntopic readwrite casa/${username}/#\n`;
  fs.appendFileSync(ACL_FILE, bloque);
}

function recargarMosquitto() {
  return new Promise((resolve, reject) => {
    execFile('docker', ['exec', MOSQUITTO_CONTAINER, 'kill', '-SIGHUP', '1'], (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

module.exports = { agregarUsuarioMqtt };
