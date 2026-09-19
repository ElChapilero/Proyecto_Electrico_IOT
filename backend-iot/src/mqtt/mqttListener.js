// mqttListener.js
//
// Este archivo escucha los mensajes que llegan del broker MQTT
// (Mosquitto), valida cada lectura del sensor PZEM-004T con el
// validador de "../modules/mediciones/pzemValidator", y solo si la lectura es
// válida la guarda en PostgreSQL. Recién cuando terminó de guardar todo
// el paquete, avisa al frontend por Socket.IO.
//
// Cambios respecto a la versión anterior:
//   1) Se renombraron las variables de una sola letra ("m", "c") por
//      nombres completos y descriptivos ("medidor", "filaCircuito").
//   2) Se agregó el validador por capas (estructura/tipos, rangos,
//      consistencia voltaje x corriente x factor_potencia ≈ potencia)
//      antes de guardar cualquier dato en la base de datos.
//   3) Se agregó un cache en memoria con la última lectura válida de
//      cada circuito, para poder generar advertencias comparativas
//      (sin rechazar) frente a la lectura anterior.
//   4) Se agregó una protección liviana contra mensajes MQTT
//      duplicados, que pueden llegar a repetirse por cómo funciona
//      QoS 1 (ver el comentario junto a "esMensajeDuplicado" más abajo).
//   5) El reenvío en vivo a Socket.IO YA NO retransmite el paquete
//      crudo tal cual llega de MQTT: primero se valida y se guarda, y
//      solo se emite lo que realmente quedó guardado en PostgreSQL.

const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('../config/db');
const validarLecturaPzem = require('../modules/mediciones/pzemValidator');
const { mqtt: mqttConfig } = require('../config/env');

const MQTT_TLS = mqttConfig.tls;
const MQTT_HOST = mqttConfig.host;
const MQTT_PORT = mqttConfig.port;

const MQTT_CA_FILE = process.env.MQTT_CA_FILE ||
  path.join(__dirname, '../../../mqtt-broker-local/config/certs/ca.crt');

const MQTT_USER = mqttConfig.listenerUser;
const MQTT_PASSWORD = mqttConfig.listenerPassword;

const TOPIC_MEDICIONES = 'casa/+/mediciones';
const TOPIC_ESTADO = 'casa/+/estado';

// uuidEsp32 -> { [indiceCircuito]: idCircuito } (evita consultar la
// base de datos en cada mensaje para resolver a qué circuito
// pertenece cada medidor).
const cacheCircuitos = new Map();

// idCircuito -> última lectura válida guardada para ese circuito. Se
// usa solo para las advertencias comparativas (capa 4 del validador),
// nunca para rechazar una lectura. Al reiniciar el backend arranca
// vacío, lo cual está bien: simplemente no habrá advertencias hasta
// la segunda lectura válida de cada circuito.
const cacheUltimaLectura = new Map();

// ---------------------------------------------------------------------
// Deduplicación de mensajes MQTT (QoS 1)
// ---------------------------------------------------------------------
// La suscripción de este listener usa qos: 1 ("al menos una vez"),
// porque para mediciones que se van a guardar en la base de datos es
// más importante no perder mensajes que evitar una posible repetición.
// La contraparte de esa decisión es que, si el broker no recibe a
// tiempo el PUBACK del backend, puede reintentar y entregar EL MISMO
// mensaje más de una vez.
//
// Como el ESP32 ya manda un "timestamp_ms" (su reloj interno, millis())
// en cada paquete, lo usamos junto con el uuid del dispositivo como
// huella para reconocer un reenvío exacto del mismo paquete dentro de
// una ventana corta de tiempo, sin necesitar tocar el firmware ni la
// base de datos.
const mensajesRecientes = new Map(); // "uuidEsp32:timestamp_ms" -> cuándo lo vimos
const VENTANA_DEDUPLICACION_MS = 30000; // 30 segundos

function limpiarMensajesAntiguos() {
  const ahora = Date.now();
  for (const [claveMensaje, marcaDeTiempo] of mensajesRecientes) {
    if (ahora - marcaDeTiempo > VENTANA_DEDUPLICACION_MS) {
      mensajesRecientes.delete(claveMensaje);
    }
  }
}

function esMensajeDuplicado(uuidEsp32, timestampDispositivoMs) {
  limpiarMensajesAntiguos();

  const claveMensaje = `${uuidEsp32}:${timestampDispositivoMs}`;
  if (mensajesRecientes.has(claveMensaje)) {
    return true;
  }

  mensajesRecientes.set(claveMensaje, Date.now());
  return false;
}

async function resolverCircuito(uuidEsp32, indiceCircuito) {
  let mapaCircuitos = cacheCircuitos.get(uuidEsp32);

  if (!mapaCircuitos) {
    const dispositivo = await pool.query(
      'SELECT id FROM dispositivos WHERE uuid_esp32 = $1',
      [uuidEsp32]
    );
    if (dispositivo.rows.length === 0) return null; // dispositivo no registrado

    const circuitos = await pool.query(
      'SELECT id, indice FROM circuitos WHERE id_dispositivo = $1',
      [dispositivo.rows[0].id]
    );

    mapaCircuitos = {};
    circuitos.rows.forEach((filaCircuito) => {
      mapaCircuitos[filaCircuito.indice] = filaCircuito.id;
    });
    cacheCircuitos.set(uuidEsp32, mapaCircuitos);
  }

  return mapaCircuitos[indiceCircuito] || null;
}

function iniciarMqttListener(io) {
  const protocolo = MQTT_TLS ? 'mqtts' : 'mqtt';
  const opciones = {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'backend_' + Math.random().toString(16).slice(2, 8),
    reconnectPeriod: 5000,
  };

  if (MQTT_TLS) {
    opciones.ca = fs.readFileSync(MQTT_CA_FILE); // valida al broker contra tu CA
  }

  const client = mqtt.connect(`${protocolo}://${MQTT_HOST}:${MQTT_PORT}`, opciones);

  client.on('connect', () => {
    console.log('✅ Backend conectado a Mosquitto');
    // qos: 1 = "al menos una vez": prioriza no perder mediciones por
    // encima de evitar una posible entrega duplicada. Por eso existe
    // la deduplicación de más arriba.
    client.subscribe([TOPIC_MEDICIONES, TOPIC_ESTADO], { qos: 1 }, (err) => {
      if (err) console.error('❌ Error al suscribirse:', err.message);
      else console.log(`📡 Suscrito a: ${TOPIC_MEDICIONES} y ${TOPIC_ESTADO}`);
    });
  });

  client.on('message', async (topic, payload) => {
    const uuidEsp32 = topic.split('/')[1];

    if (topic.endsWith('/estado')) {
      const estado = payload.toString();
      console.log(`🔌 [${uuidEsp32}] estado: ${estado}`);
      if (io) io.emit('estado-dispositivo', { uuid: uuidEsp32, estado });
      return;
    }

    let datos;
    try {
      datos = JSON.parse(payload.toString());
    } catch (error) {
      console.error('⚠️ No se pudo parsear el mensaje MQTT:', error.message);
      return;
    }

    // Si este mismo paquete (mismo dispositivo + mismo timestamp_ms del
    // ESP32) ya se proceso hace poco, lo descartamos: es un reenvío de
    // QoS 1, no una medición nueva.
    if (datos.timestamp_ms !== undefined && esMensajeDuplicado(uuidEsp32, datos.timestamp_ms)) {
      console.warn(`♻️ Mensaje duplicado descartado (QoS 1) [${uuidEsp32}] timestamp_ms=${datos.timestamp_ms}`);
      return;
    }

    const listaMedidores = datos.medidores || [];
    // Todas las lecturas de un mismo JSON representan un único paquete.
    // Se usa una sola marca temporal para agrupar sus circuitos.
    const recibidoEn = new Date();

    // Acá se van juntando SOLO las lecturas que pasaron la validación y
    // que efectivamente se insertaron en PostgreSQL. Es la lista que
    // más abajo se manda por Socket.IO: nunca se emite un dato que no
    // haya quedado guardado en la base de datos.
    const medicionesGuardadas = [];

    for (const medidor of listaMedidores) {
      try {
        const idCircuito = await resolverCircuito(uuidEsp32, medidor.circuito);

        if (!idCircuito) {
          console.warn(`⚠️ Dispositivo/circuito desconocido: ${uuidEsp32} circuito ${medidor.circuito} (¿ya se registró?)`);
          continue;
        }

        const lecturaAnterior = cacheUltimaLectura.get(idCircuito) || null;
        const resultadoValidacion = validarLecturaPzem(medidor, lecturaAnterior);

        if (!resultadoValidacion.valido) {
          console.warn(
            `🚫 Lectura rechazada [${uuidEsp32} circuito ${medidor.circuito}] (${resultadoValidacion.tipo}): ${resultadoValidacion.error}`
          );
          continue; // no se guarda en la base de datos
        }

        // Las advertencias NO bloquean el guardado, solo quedan en el
        // log para que puedan revisarse después (por ejemplo, un
        // reinicio del contador de energía del dispositivo).
        (resultadoValidacion.advertencias || []).forEach((textoAdvertencia) => {
          console.warn(`⚠️ [${uuidEsp32} circuito ${medidor.circuito}] ${textoAdvertencia}`);
        });

        await pool.query(
          `INSERT INTO mediciones (circuito_id, potencia, energia, voltaje, corriente, frecuencia, factor_potencia, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [idCircuito, medidor.potencia, medidor.energia, medidor.voltaje, medidor.corriente, medidor.frecuencia, medidor.factor_potencia, recibidoEn]
        );

        // Se actualiza el cache de "última lectura" recién acá, DESPUÉS
        // de guardar, para que la próxima comparación sea siempre
        // contra un dato que sí quedó persistido.
        cacheUltimaLectura.set(idCircuito, medidor);

        medicionesGuardadas.push({
          circuito: medidor.circuito,
          id_circuito: idCircuito,
          voltaje: medidor.voltaje,
          corriente: medidor.corriente,
          potencia: medidor.potencia,
          energia: medidor.energia,
          frecuencia: medidor.frecuencia,
          factor_potencia: medidor.factor_potencia,
        });
      } catch (error) {
        console.error(`❌ Error guardando medicion (circuito ${medidor.circuito}) de ${uuidEsp32}:`, error.message);
        // NOTA sobre rendimiento (para más adelante, no hace falta
        // ahora): cada medidor se guarda con su propio INSERT
        // independiente, para que si uno falla los demás circuitos de
        // este mismo paquete se sigan guardando igual. Cuando haya
        // muchos circuitos o mucha frecuencia de mensajes, esto puede
        // pasarse a un insert por lote (bulk insert) dentro de una
        // transacción; por ahora, con pocos circuitos, no es
        // necesario y se prioriza la resiliencia por sobre la
        // performance.
      }
    }

    console.log(
      `📥 [${uuidEsp32}] paquete procesado: ${medicionesGuardadas.length} de ${listaMedidores.length} lecturas guardadas`
    );

    // ------------------------------------------------------------------
    // Reenvío en vivo al dashboard (Socket.IO)
    // ------------------------------------------------------------------
    // OJO: acá NO hay que reenviar el payload crudo tal cual llega de
    // MQTT apenas se recibe. Si se hiciera así:
    //   - Podría traer lecturas fuera de rango o inconsistentes que el
    //     validador de arriba acaba de rechazar, y el frontend
    //     mostraría un dato que en realidad nunca se guardó.
    //   - Si el INSERT de un circuito falla, el frontend ya se habría
    //     enterado igual de un dato que no quedó en la base de datos.
    // Por eso primero se valida y se guarda en PostgreSQL (todo el
    // bloque de arriba), y recién acá, con el guardado ya confirmado,
    // se emite SOLO lo que efectivamente quedó en la base de datos.
    //
    // Así es como NO se debe hacer (se deja comentado a modo de
    // referencia, era el comportamiento anterior):
    //
    // if (io) {
    //   io.emit('mensaje-mqtt', { topic, datos, timestamp: new Date().toISOString() });
    // }

    if (io && medicionesGuardadas.length > 0) {
      io.emit('mensaje-mqtt', {
        topic,
        uuid_esp32: uuidEsp32,
        medidores: medicionesGuardadas,
        // Momento en el que el BACKEND generó este evento de
        // Socket.IO (no necesariamente el instante exacto en el que
        // el ESP32 tomó la medición).
        timestamp: new Date().toISOString(),
        // Instante del ESP32 en el momento de armar el paquete
        // (millis() = milisegundos desde que arrancó el
        // dispositivo). Sirve para ordenar/agrupar paquetes del mismo
        // dispositivo, pero OJO: no es una fecha real salvo que el
        // firmware se sincronice con NTP.
        timestamp_dispositivo_ms: datos.timestamp_ms ?? null,
      });
    }
  });

  client.on('error', (err) => console.error('❌ Error de conexion MQTT:', err.message));
  client.on('reconnect', () => console.log('♻️ Reintentando conexion MQTT...'));

  return client;
}

module.exports = { iniciarMqttListener };
