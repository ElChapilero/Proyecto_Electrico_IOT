<template>
  <div class="shell">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <nav class="shell-nav" aria-label="Secciones">
      <router-link class="nav-item" to="/dashboard/resumen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M5 19V13" /><path d="M12 19V7" /><path d="M19 19V15" />
        </svg>
        <span>Resumen</span>
      </router-link>
      <router-link class="nav-item" to="/dashboard/alertas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" /><path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
        <span>Alertas</span>
      </router-link>
      <router-link class="nav-item" to="/dashboard/historial">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />
        </svg>
        <span>Historial</span>
      </router-link>
      <router-link class="nav-item" to="/dashboard/dispositivos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 2v4M15 2v4M7 9h10v3a5 5 0 0 1-10 0V9Z" /><path d="M12 17v3" />
        </svg>
        <span>Dispositivos</span>
      </router-link>
      <router-link class="nav-item" to="/dashboard/configuraciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="2.6" />
          <path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7" />
        </svg>
        <span>Configuraciones</span>
      </router-link>
    </nav>

    <div class="shell-main">
      <header class="shell-topbar">
        <span class="brand">Vatio</span>

        <button class="icon-btn" @click="salir" aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 3v8" /><path d="M6.5 6.5a7 7 0 1 0 11 0" />
          </svg>
        </button>
      </header>

      <main id="contenido" class="shell-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function salir() {
  localStorage.removeItem('token');
  router.push('/login');
}
</script>

<style scoped>
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--surface);
  padding: 8px 12px;
  z-index: 100;
}
.skip-link:focus { left: 8px; top: 8px; }

.shell {
  min-height: 100dvh;
  background: var(--paper);
}

.shell-main { min-height: 100dvh; display: flex; flex-direction: column; }

.shell-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: var(--space-4) var(--space-4) var(--space-3);
}

.brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.02em;
  color: var(--volt-teal-dark);
}

.icon-btn {
  margin-left: auto;
  background: none;
  border: 0;
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-muted);
  line-height: 0;
  flex-shrink: 0;
}
.icon-btn:hover { background: var(--volt-teal-soft); color: var(--volt-teal-dark); }
.icon-btn svg { width: 20px; height: 20px; }

.shell-content {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) calc(88px + env(safe-area-inset-bottom));
}

.shell-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: var(--space-2) var(--space-1) calc(var(--space-2) + env(safe-area-inset-bottom));
}

.nav-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 2px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}
.nav-item svg { width: 20px; height: 20px; }
.nav-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.nav-item.router-link-active { color: var(--volt-teal-dark); background: var(--volt-teal-soft); }

/* ------------------------------------------------------------
   Desktop / tablet ancho: la bottom bar se convierte en un rail
   lateral fijo, y el contenido usa el ancho disponible en vez
   de quedar angosto como si siguiera siendo un telefono.
   ------------------------------------------------------------ */
@media (min-width: 900px) {
  .shell { display: flex; }

  .shell-nav {
    position: sticky;
    top: 0;
    left: auto;
    right: auto;
    bottom: auto;
    height: 100dvh;
    width: 116px;
    flex-shrink: 0;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-2);
    border-top: none;
    border-right: 1px solid var(--line);
  }

  .nav-item { flex: 0 0 auto; padding: 10px 8px; font-size: 11px; }
  .nav-item svg { width: 22px; height: 22px; }

  .shell-main { flex: 1; min-width: 0; }

  .shell-topbar { padding: var(--space-5) var(--space-6) var(--space-4); }

  .shell-content { max-width: 880px; padding: var(--space-6) var(--space-6) var(--space-7); }
}
</style>
