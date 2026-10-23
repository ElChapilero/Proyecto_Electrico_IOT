import { http } from "./http";

export const dispositivosApi = {
  listarPaneles: (predioId) => http.get(`/predios/${predioId}/paneles`),
  crearPanel: (predioId, payload) => http.post(`/predios/${predioId}/paneles`, payload),
  actualizarPanel: (panelId, payload) => http.patch(`/paneles/${panelId}`, payload),
  eliminarPanel: (panelId) => http.delete(`/paneles/${panelId}`),
  listarDispositivos: (panelId) => http.get(`/paneles/${panelId}/dispositivos`),
  actualizarDispositivo: (id, payload) => http.patch(`/dispositivos/${id}`, payload),
  eliminarDispositivo: (id) => http.delete(`/dispositivos/${id}`),
  generarCodigo: (panelId) => http.post("/dispositivos/generar-codigo", { panelId }),
  listarCircuitos: (id) => http.get(`/dispositivos/${id}/circuitos`),
  actualizarCircuito: (id, payload) => http.patch(`/circuitos/${id}`, payload),
  eliminarCircuito: (id) => http.delete(`/circuitos/${id}`),
};
