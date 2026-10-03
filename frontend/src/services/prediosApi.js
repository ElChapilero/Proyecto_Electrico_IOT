import { http } from './http';

export const prediosApi = {
  list: () => http.get('/predios'),
  create: (payload) => http.post('/predios', payload),
  update: (predioId, payload) => http.patch(`/predios/${predioId}`, payload),
  panels: (predioId) => http.get(`/predios/${predioId}/paneles`),
};
