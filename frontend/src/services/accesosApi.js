import { http } from "./http";

export const accesosApi = {
  list: (predioId) => http.get(`/predios/${predioId}/accesos`),
  add: (predioId, payload) => http.post(`/predios/${predioId}/accesos`, payload),
  updateRole: (predioId, usuarioId, rol) =>
    http.patch(`/predios/${predioId}/accesos/${usuarioId}`, { rol }),
  remove: (predioId, usuarioId) =>
    http.delete(`/predios/${predioId}/accesos/${usuarioId}`),
};
