import { reactive, computed } from 'vue';
import { createRealtimeSocket } from '../services/realtimeApi';
import { storage } from '../utils/storage';

const state = reactive({ status: 'desconectado', ultimaMedicion: null, ultimoEstadoDispositivo: null, ultimaAlerta: null, error: '' });
let socket;
let joinedId = null;

function connect() {
  const token = storage.getToken();
  if (!token || socket) return;
  socket = createRealtimeSocket(token);
  state.status = 'reconectando';
  socket.on('connect', () => { state.status = 'conectado'; if (joinedId) joinProperty(joinedId); });
  socket.on('disconnect', () => { state.status = 'desconectado'; });
  socket.on('connect_error', (error) => { state.status = 'desconectado'; state.error = error.message; });
  socket.io.on('reconnect_attempt', () => { state.status = 'reconectando'; });
  socket.on('mensaje-mqtt', (payload) => { state.ultimaMedicion = payload; });
  socket.on('estado-dispositivo', (payload) => { state.ultimoEstadoDispositivo = payload; });
  socket.on('alerta-generada', (payload) => { state.ultimaAlerta = payload; });
  socket.connect();
}

function joinProperty(predioId) {
  joinedId = predioId;
  connect();
  if (socket?.connected) socket.emit('unirse-predio', { predioId }, (result) => { if (!result?.ok) state.error = result?.error || 'No se pudo entrar al predio'; });
}
function leaveProperty(predioId) { if (socket?.connected) socket.emit('salir-predio', { predioId }); if (joinedId === predioId) joinedId = null; }
function disconnect() { if (joinedId) leaveProperty(joinedId); socket?.disconnect(); socket = null; state.status = 'desconectado'; state.ultimaMedicion = null; state.ultimoEstadoDispositivo = null; state.ultimaAlerta = null; }

export function useRealtimeStore() { return { state, status: computed(() => state.status), connect, joinProperty, leaveProperty, disconnect }; }
