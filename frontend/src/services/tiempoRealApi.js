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
};
