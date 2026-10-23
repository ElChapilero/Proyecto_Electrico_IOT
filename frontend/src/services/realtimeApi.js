import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function createRealtimeSocket(token) {
  return io(SOCKET_URL, { auth: { token }, autoConnect: false });
}
