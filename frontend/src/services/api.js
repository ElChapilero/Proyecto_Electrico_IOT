//api.js
const BASE_URL = '/api';

function obtenerToken() {
  return localStorage.getItem('token');
}

async function peticion(path, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(BASE_URL + path, { ...opciones, headers });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || `Error ${respuesta.status}`);
  }
  return datos;
}

export const api = {
  registro: (email, nombre, password) =>
    peticion('/auth/registro', { method: 'POST', body: JSON.stringify({ email, nombre, password }) }),

  login: (email, password) =>
    peticion('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  misPredios: () => peticion('/predios'),
  crearPredio: (nombre, tipo_predio) =>
    peticion('/predios', { method: 'POST', body: JSON.stringify({ nombre, tipo_predio }) }),
  renombrarPredio: (id, nombre) =>
    peticion(`/predios/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),

  misPaneles: (idPredio) => peticion(idPredio ? `/paneles?id_predio=${idPredio}` : '/paneles'),

  crearPanel: (datos) => peticion('/paneles', { method: 'POST', body: JSON.stringify(datos) }),
  renombrarPanel: (id, nombre) =>
    peticion(`/paneles/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),

  misDispositivos: (idPanel) =>
    peticion(idPanel ? `/dispositivos?id_panel=${idPanel}` : '/dispositivos'),

  generarCodigo: (idPanel) =>
    peticion('/dispositivos/generar-codigo', {
      method: 'POST',
      body: JSON.stringify({ id_panel: idPanel }),
    }),

  moverDispositivo: (id, idPanel) =>
    peticion(`/dispositivos/${id}`, { method: 'PATCH', body: JSON.stringify({ id_panel: idPanel }) }),
  renombrarDispositivo: (id, nombre) =>
    peticion(`/dispositivos/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),

  misCircuitos: (idDispositivo) =>
    peticion(idDispositivo ? `/circuitos?id_dispositivo=${idDispositivo}` : '/circuitos'),
  renombrarCircuito: (id, nombre) =>
    peticion(`/circuitos/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),
};
