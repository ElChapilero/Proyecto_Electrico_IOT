import { computed, reactive } from "vue";
import { authApi } from "../services/authApi";
import { storage } from "../utils/storage";

const state = reactive({
  token: storage.getToken(),
  usuario: null,
  cargando: false,
  error: "",
  inicializada: false,
});
let sessionPromise;

function clearSession() {
  storage.removeToken();
  state.token = null;
  state.usuario = null;
  state.inicializada = true;
  state.error = "";
}

async function initialize() {
  if (state.inicializada) return state.usuario;
  if (sessionPromise) return sessionPromise;
  if (!state.token) {
    state.inicializada = true;
    return null;
  }
  state.cargando = true;
  sessionPromise = authApi
    .me()
    .then((user) => {
      state.usuario = user;
      return user;
    })
    .catch((error) => {
      clearSession();
      return null;
    })
    .finally(() => {
      state.cargando = false;
      state.inicializada = true;
      sessionPromise = null;
    });
  return sessionPromise;
}

async function authenticate(payload, mode = "login") {
  state.cargando = true;
  state.error = "";
  try {
    const result =
      mode === "register"
        ? await authApi.register(payload)
        : await authApi.login(payload);
    storage.setToken(result.token);
    state.token = result.token;
    state.usuario = result.usuario;
    state.inicializada = true;
    return result;
  } catch (error) {
    state.error = error.message;
    throw error;
  } finally {
    state.cargando = false;
  }
}

function logout() {
  clearSession();
}

export function useAuthStore() {
  return {
    state,
    token: computed(() => state.token),
    usuario: computed(() => state.usuario),
    rol: computed(() => state.usuario?.rol || null),
    autenticado: computed(() => Boolean(state.usuario && state.token)),
    initialize,
    authenticate,
    logout,
    clearSession,
  };
}
