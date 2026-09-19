<template>
  <div class="auth-page">
    <form class="auth-form" @submit.prevent="enviar">
      <span class="brand">Vatio</span>
      <div class="wave-divider small" aria-hidden="true"></div>

      <h1>Crear cuenta</h1>
      <p v-if="error" class="error">{{ error }}</p>

      <label>Nombre</label>
      <input type="text" v-model="nombre" required />
      <label>Correo</label>
      <input type="email" v-model="email" required />
      <label>Contraseña</label>
      <input type="password" v-model="password" minlength="6" required />

      <button class="btn-primary" type="submit" :disabled="cargando">
        {{ cargando ? 'Creando...' : 'Crear cuenta' }}
      </button>
      <p class="link">¿Ya tenés cuenta? <router-link to="/login">Iniciá sesión</router-link></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';

const nombre = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const cargando = ref(false);
const router = useRouter();

async function enviar() {
  error.value = '';
  cargando.value = true;
  try {
    const { token } = await api.registro(email.value, nombre.value, password.value);
    localStorage.setItem('token', token);
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
  padding: var(--space-4);
  background: var(--paper);
}

.auth-form {
  background: var(--surface);
  padding: var(--space-6) var(--space-5) var(--space-5);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 360px;
  box-shadow: var(--shadow-md);
}

.brand { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--volt-teal-dark); letter-spacing: 0.02em; }
.wave-divider.small { width: 56px; margin: var(--space-3) 0 var(--space-4); border-radius: 999px; overflow: hidden; }

h1 { font-size: 22px; margin-bottom: var(--space-3); }

.auth-form label { display: block; margin-top: var(--space-3); font-size: 13px; font-weight: 600; color: var(--text-muted); }
.auth-form input {
  width: 100%;
  padding: 11px 12px;
  margin-top: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  box-sizing: border-box;
  font-size: 15px;
}
.auth-form input:focus { border-color: var(--volt-teal); }

.btn-primary { width: 100%; margin-top: var(--space-5); }

.error { color: var(--volt-coral); font-size: 14px; margin: 0 0 var(--space-2); }
.link { font-size: 14px; margin-top: var(--space-4); text-align: center; color: var(--text-muted); }
</style>