import { http } from "./http";

export const tiempoRealApi = {
  listarPaneles: (predioId) => http.get(`/predios/${predioId}/paneles`),
  listarDispositivos: (panelId) => http.get(`/paneles/${panelId}/dispositivos`),
  listarCircuitos: (dispositivoId) =>
    http.get(`/dispositivos/${dispositivoId}/circuitos`),
  listarMediciones: (circuitoId, from) =>
    http.get(
      `/circuitos/${circuitoId}/mediciones?from=${encodeURIComponent(from)}&limit=1000`,
    ),
  dashboard: (circuitoId, { period, from, to }) => {
    const params = new URLSearchParams({ period });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return http.get(`/circuitos/${circuitoId}/analitica/dashboard?${params}`);
  },
  compararPaneles: async (predioId, { period, from, to }) => {
    const params = new URLSearchParams({ period });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await http.get(`/predios/${predioId}/analitica/paneles/comparacion?${params}`);
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
  },
  compararCircuitos: async (predioId, { period, from, to, panelId }) => {
    const params = new URLSearchParams({ period });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (panelId) params.set("panelId", panelId);
    const response = await http.get(`/predios/${predioId}/analitica/circuitos/comparacion?${params}`);
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
  },
};
