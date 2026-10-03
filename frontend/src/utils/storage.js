const TOKEN_KEY = 'vatio.jwt';
const PREDIO_KEY = 'vatio.predioId';

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  getPredioId: () => localStorage.getItem(PREDIO_KEY),
  setPredioId: (id) => (id ? localStorage.setItem(PREDIO_KEY, id) : localStorage.removeItem(PREDIO_KEY)),
  removePredioId: () => localStorage.removeItem(PREDIO_KEY),
};
