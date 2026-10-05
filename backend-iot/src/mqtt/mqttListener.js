// Este archivo escucha los mensajes que llegan desde Mosquitto, valida
// las lecturas del PZEM-004T y guarda en PostgreSQL solo los datos válidos.
// Cuando termina de guardar el paquete, informa al frontend por Socket.IO.

// Cambios principales:
// 1) Se cambiaron nombres cortos como "m" y "c" por nombres más claros.
// 2) Se agregó la validación por capas: estructura, rangos y consistencia
// entre voltaje, corriente, potencia y factor de potencia.
// 3) Se guarda en memoria la última lectura válida de cada circuito para
// poder detectar cambios llamativos sin rechazar una lectura válida.
// 4) Se agregó una protección contra mensajes duplicados por QoS 1.
// 5) Socket.IO solo recibe las mediciones que realmente fueron guardadas
// en PostgreSQL.
// 6) (Fix vulnerabilidad crítica 2.3) Las mediciones ya no se envían a
// todos los clientes conectados. Se envían únicamente a la sala del
// predio al que pertenece el dispositivo.
// 7) (Fix bug crítico 1.1) Cada medición guardada se revisa contra las
// alertas activas de su circuito para registrar las alertas que correspondan.
// 8) (Fix bug importante 3.1) La información del dispositivo se guarda en
// un cache separado que puede invalidarse cuando cambia su panel, predio
// o circuitos. Así no se siguen usando datos viejos hasta reiniciar el backend.

const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('../config/db');
const validarLecturaPzem = require('../modules/mediciones/pzemValidator');
const alertasService = require('../modules/alertas/alertas.service');
const { recalcularDespuesDeInsertar } = require('../modules/mediciones/medicionesHorarias.service');
const { mqtt: mqttConfig } = require('../config/env');
const { emitirMedicionGuardada, emitirEstadoDispositivo } = require('../realtime/realtime.service');
const { obtenerInfoDispositivo } = require('./dispositivoCache');

const MQTT_TLS = mqttConfig.tls;
const MQTT_HOST = mqttConfig.host;
const MQTT_PORT = mqttConfig.port;

const MQTT_CA_FILE = mqttConfig.caFile || process.env.MQTT_CA_FILE ||
  path.join(__dirname, '../../../mqtt-broker-local/config/certs/ca.crt');

const MQTT_USER = mqttConfig.listenerUser;
const MQTT_PASSWORD = mqttConfig.listenerPassword;

const TOPIC_MEDICIONES = 'casa/+/mediciones';
const TOPIC_ESTADO = 'casa/+/estado';

// Última lectura válida de cada circuito.
// Se usa para las comparaciones del validador, pero nunca para rechazar
// una lectura. Al reiniciar el backend, el cache queda vacío y vuelve a
// llenarse con las nuevas lecturas.
const cacheUltimaLectura = new Map();

// Deduplicación de mensajes MQTT (QoS 1)
// QoS 1 garantiza que el mensaje llegue al menos una vez, pero también
// permite que el mismo mensaje se entregue más de una vez si el broker
// no recibe a tiempo el PUBACK.

// El ESP32 incluye timestamp_ms en cada paquete, así que usamos ese valor
// junto con el uuid del dispositivo para detectar reenvíos del mismo
// paquete dentro de una ventana corta, sin modificar el firmware ni la BD.
const mensajesRecientes = new Map(); // "uuidEsp32:timestamp_ms" -> cuándo lo vimos
const ultimoTimestampPorDispositivo = new Map();
const colasPorDispositivo = new Map();
const VENTANA_DEDUPLICACION_MS = 30000; // 30 segundos
const EPOCH_MINIMO_DISPOSITIVO_MS = Date.UTC(2024, 0, 1);
const DESFASE_FUTURO_MAXIMO_MS = 10 * 60 * 1000;

function obtenerFechaAdquisicion(timestampMs) {
  if (timestampMs === undefined || timestampMs === null || timestampMs === '') {
    return null;
  }
  const numero = typeof timestampMs === 'number' ? timestampMs : Number(timestampMs);
  if (!Number.isSafeInteger(numero) || numero < EPOCH_MINIMO_DISPOSITIVO_MS) {
    return null;
  }
  if (numero > Date.now() + DESFASE_FUTURO_MAXIMO_MS) {
    return null;
  }
  const fecha = new Date(numero);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

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

  const anterior = ultimoTimestampPorDispositivo.get(uuidEsp32);
  if (Number.isFinite(timestampDispositivoMs) && Number.isFinite(anterior) && timestampDispositivoMs < anterior) {
    for (const clave of mensajesRecientes.keys()) {
      if (clave.startsWith(`${uuidEsp32}:`)) mensajesRecientes.delete(clave);
    }
  }
  if (Number.isFinite(timestampDispositivoMs)) {
    ultimoTimestampPorDispositivo.set(uuidEsp32, timestampDispositivoMs);
  }

  const claveMensaje = `${uuidEsp32}:${timestampDispositivoMs}`;
  if (mensajesRecientes.has(claveMensaje)) {
    return true;
  }

  mensajesRecientes.set(claveMensaje, Date.now());
  return false;
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
    // qos: 1 = al menos una vez.
    // Se prioriza no perder mediciones, aunque pueda existir alguna entrega
    // duplicada. La deduplicación anterior se encarga de ese caso.
    client.subscribe([TOPIC_MEDICIONES, TOPIC_ESTADO], { qos: 1 }, (err) => {
      if (err) console.error('❌ Error al suscribirse:', err.message);
      else console.log(`📡 Suscrito a: ${TOPIC_MEDICIONES} y ${TOPIC_ESTADO}`);
    });
  });

  client.on('message', async (topic, payload) => {
    const uuidEsp32 = topic.split('/')[1];
    const anterior = colasPorDispositivo.get(uuidEsp32) || Promise.resolve();
    let liberar;
    const turno = new Promise((resolve) => { liberar = resolve; });
    const colaActual = anterior.then(() => turno);
    colasPorDispositivo.set(uuidEsp32, colaActual);
    await anterior;
    try {
      const infoDispositivo = await obtenerInfoDispositivo(uuidEsp32);

    if (topic.endsWith('/estado')) {
      const estado = payload.toString();
      console.log(`🔌 [${uuidEsp32}] estado: ${estado}`);
      // Si el dispositivo no está registrado no sabemos a qué predio pertenece,
      // por lo que no se emite el estado a ninguna sala.
      if (infoDispositivo) {
        emitirEstadoDispositivo(io, infoDispositivo.idPredio, { uuid: uuidEsp32, estado });
      }
      return;
    }

    let datos;
    try {
      datos = JSON.parse(payload.toString());
      } catch (error) {
        console.error('⚠️ No se pudo parsear el mensaje MQTT:', error.message);
        return;
      }
      if (!datos || typeof datos !== 'object' || !Array.isArray(datos.medidores)) {
        console.warn(`⚠️ Payload MQTT inválido [${uuidEsp32}]: medidores debe ser una lista`);
        return;
      }

    const fechaAdquisicion = obtenerFechaAdquisicion(datos.timestamp_ms);
    if (!fechaAdquisicion) {
      console.warn(`⚠️ Payload MQTT descartado [${uuidEsp32}]: timestamp_ms inválido o ausente`);
      return;
    }

    // Si este mismo paquete ya fue procesado recientemente, se descarta.
    // Esto puede ocurrir con QoS 1 cuando el broker vuelve a entregar
    // exactamente el mismo mensaje.
    const timestampDispositivo = Number(datos.timestamp_ms);
    if (Number.isSafeInteger(timestampDispositivo) && esMensajeDuplicado(uuidEsp32, timestampDispositivo)) {
      console.warn(`♻️ Mensaje duplicado descartado (QoS 1) [${uuidEsp32}] timestamp_ms=${datos.timestamp_ms}`);
      return;
    }

    const listaMedidores = datos.medidores;
    // Todas las lecturas de este JSON pertenecen al mismo paquete y utilizan
    // el instante absoluto capturado por el ESP32 al tomar la muestra.
    const recibidoEn = new Date();

    // Acá se guardan solo las lecturas que pasaron la validación y además
    // fueron insertadas correctamente en PostgreSQL. Esa misma lista se usa
    // después para Socket.IO, así el frontend nunca recibe datos que no
    // quedaron guardados.
    const medicionesGuardadas = [];

    for (const medidor of listaMedidores) {
      try {
        const idCircuito = infoDispositivo?.porIndice[medidor.circuito];

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

        // Las advertencias son solo informativas. No bloquean el guardado.
        (resultadoValidacion.advertencias || []).forEach((textoAdvertencia) => {
          console.warn(`⚠️ [${uuidEsp32} circuito ${medidor.circuito}] ${textoAdvertencia}`);
        });

        const filaMedicion = await pool.query(
          `INSERT INTO mediciones (circuito_id, potencia, energia, voltaje, corriente, factor_potencia, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [idCircuito, medidor.potencia, medidor.energia, medidor.voltaje, medidor.corriente, medidor.factor_potencia, fechaAdquisicion]
        );
        const idMedicion = filaMedicion.rows[0].id;

        // El agregado es derivado y nunca sustituye la medición original.
        // Si falla, la telemetría sigue siendo válida y la hora puede reconstruirse.
        await recalcularDespuesDeInsertar(idCircuito, fechaAdquisicion);


        // Se actualiza la última lectura únicamente después de confirmar el INSERT.
        // Así la siguiente comparación siempre parte de un dato que sí quedó
        // guardado en PostgreSQL.
        cacheUltimaLectura.set(idCircuito, medidor);

        // (Fix bug crítico 1.1)
        // Después de guardar la medición se revisan las alertas configuradas
        // para ese circuito y se registran las que correspondan.
        await alertasService.evaluarYRegistrarAlertas(
          idCircuito,
          medidor,
          idMedicion,
          io,
          infoDispositivo.idPredio,
        );

        medicionesGuardadas.push({
          circuito: medidor.circuito,
          id_circuito: idCircuito,
          voltaje: medidor.voltaje,
          corriente: medidor.corriente,
          potencia: medidor.potencia,
          energia: medidor.energia,
          factor_potencia: medidor.factor_potencia,
          created_at: fechaAdquisicion.toISOString(),
        });
      } catch (error) {
        console.error(`❌ Error guardando medicion (circuito ${medidor.circuito}) de ${uuidEsp32}:`, error.message);
        // NOTA sobre rendimiento (para más adelante, no hace falta
        // ahora): cada medidor se guarda con su propio INSERT
        // independiente, para que si uno falla los demás circuitos de
        // este mismo paquete se sigan guardando igual. Cuando haya
        // muchos circuitos o un alto volumen de mensajes, esto puede
        // pasarse a un insert por lote (bulk insert) dentro de una
        // transacción; por ahora, con pocos circuitos, no es
        // necesario y se prioriza la resiliencia por sobre la
        // performance.
      }
    }

    console.log(
      `📥 [${uuidEsp32}] paquete procesado: ${medicionesGuardadas.length} de ${listaMedidores.length} lecturas guardadas`
    );
    // Reenvío en vivo al dashboard (Socket.IO)
    // No se envía el payload original directamente desde MQTT.
    // Primero se valida y se guarda en PostgreSQL.
    // Así se evita que el frontend muestre:
    // - lecturas que el validador rechazó;
    // - lecturas de un circuito cuyo INSERT falló.
    // Por eso Socket.IO recibe únicamente las mediciones confirmadas en la BD.
    // Tampoco se usa io.emit() global.

    // (Fix vulnerabilidad crítica 2.3)
    // El evento se envía únicamente a la sala del predio correspondiente,
    // para que un cliente no pueda recibir mediciones de otros predios.
    if (medicionesGuardadas.length > 0 && infoDispositivo) {
      emitirMedicionGuardada(io, infoDispositivo.idPredio, {
        topic,
        uuid_esp32: uuidEsp32,
        medidores: medicionesGuardadas,
        timestamp: fechaAdquisicion.toISOString(),
        timestamp_recepcion: recibidoEn.toISOString(),
        timestamp_dispositivo_ms: datos.timestamp_ms ?? null,
      });
    }
    } catch (error) {
      console.error('❌ Error no controlado procesando mensaje MQTT:', error.message);
    } finally {
      liberar();
      if (colasPorDispositivo.get(uuidEsp32) === colaActual) colasPorDispositivo.delete(uuidEsp32);
    }
  });

  client.on('error', (err) => console.error('❌ Error de conexion MQTT:', err.message));
  client.on('reconnect', () => console.log('♻️ Reintentando conexion MQTT...'));

  return client;
}

module.exports = { iniciarMqttListener };
