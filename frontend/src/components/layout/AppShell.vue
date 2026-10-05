<template>
  <div class="shell">
    <a class="skip" href="#main">Saltar al contenido</a>
    <div class="main">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">◌</span><span>Vatio</span>
        </div>
        <nav class="top-nav desktop-only" aria-label="Navegación principal">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            >{{ item.label }}</router-link
          >
        </nav>
        <div class="top-actions">
          <PredioSelector />
          <div class="user-chip">
            <span>{{ auth.usuario.value?.nombre || "Usuario" }}</span
            ><small>{{ predio.predioActual.value?.rol || "—" }}</small>
          </div>
          <button class="logout-button" type="button" @click="logout">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main id="main" class="page-container"><router-view /></main>
      <nav class="bottom-nav mobile-only" aria-label="Navegación móvil">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path"
          ><span class="nav-icon">{{ item.icon }}</span
          ><span>{{ item.label }}</span></router-link
        >
      </nav>
    </div>
  </div>
</template>
<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import PredioSelector from "../selectors/PredioSelector.vue";
import { useAuthStore } from "../../stores/authStore";
import { usePredioStore } from "../../stores/predioStore";
import { useRealtimeStore } from "../../stores/realtimeStore";
const navItems = [
  { path: "/dashboard/inicio", label: "Inicio", icon: "⌂" },
  { path: "/dashboard/tiempo-real", label: "Tiempo real", icon: "⌁" },
  { path: "/dashboard/resumen", label: "Resumen", icon: "◒" },
  { path: "/dashboard/alertas", label: "Alertas", icon: "!" },
  { path: "/dashboard/historial", label: "Historial", icon: "◷" },
  { path: "/dashboard/dispositivos", label: "Dispositivos", icon: "⌗" },
  { path: "/dashboard/configuracion", label: "Configuración", icon: "⚙" },
];
const router = useRouter();
const auth = useAuthStore();
const predio = usePredioStore();
const realtime = useRealtimeStore();
onMounted(async () => {
  try {
    await predio.load();
    realtime.connect();
  } catch {}
});
function logout() {
  predio.clear();
  realtime.disconnect();
  auth.logout();
  router.replace("/login");
}
</script>
<style scoped>
.shell {
  min-height: 100dvh;
  background:
    radial-gradient(
      circle at 50% -20%,
      rgba(54, 92, 139, 0.18),
      transparent 42%
    ),
    var(--color-paper);
}
.main {
  min-width: 0;
}
.topbar {
  min-height: 66px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 22px;
  padding: 0 max(24px, calc((100% - 1100px) / 2));
  background: rgba(10, 18, 32, 0.92);
  border-bottom: 1px solid rgba(88, 121, 160, 0.16);
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  backdrop-filter: blur(12px);
}
.brand {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #b8d8ff;
  font: 700 16px var(--font-display);
}
.brand-mark {
  font-size: 26px;
  line-height: 0.6;
  color: #e3efff;
}
.top-nav {
  display: flex;
  align-items: center;
  gap: 21px;
  height: 100%;
  white-space: nowrap;
}
.top-nav a {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  color: #d2deec;
  text-decoration: none;
  font-size: 13px;
}
.top-nav a:hover,
.top-nav a.router-link-active {
  color: #fff;
}
.top-nav a.router-link-active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}
.top-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.top-actions :deep(.property) {
  min-width: 150px;
}
.user-chip {
  display: grid;
  gap: 2px;
  font-size: 12px;
  text-align: right;
  color: #f1f6fd;
}
.user-chip small {
  color: #d2deec;
  text-transform: capitalize;
}
.logout-button {
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid #45617e;
  border-radius: var(--radius-sm);
  background: #1b2d43;
  color: #e8f1fb;
  font-size: 12px;
  font-weight: 700;
}
.logout-button:hover {
  background: #294766;
}
.skip {
  position: absolute;
  left: -999px;
}
.skip:focus {
  left: 12px;
  top: 12px;
  z-index: var(--z-modal);
  background: var(--color-surface);
  padding: 8px;
}
.page-container {
  padding-top: 32px;
  padding-bottom: 32px;
}
.bottom-nav {
  display: none;
}
@media (max-width: 1050px) and (min-width: 900px) {
  .top-nav {
    gap: 12px;
  }
  .top-nav a {
    font-size: 12px;
  }
  .user-chip {
    display: none;
  }
}
@media (max-width: 899px) {
  .topbar {
    display: flex;
    min-height: 62px;
    padding: 10px 16px;
  }
  .brand {
    margin-right: auto;
  }
  .top-actions {
    gap: 8px;
  }
  .user-chip {
    display: none;
  }
  .top-actions :deep(.property) {
    min-width: 145px;
  }
  .logout-button {
    font-size: 0;
    width: 34px;
    padding: 0;
    position: relative;
  }
  .logout-button::after {
    content: "↪";
    font-size: 18px;
  }
  .page-container {
    padding: 24px 16px 92px;
  }
  .bottom-nav {
    position: fixed;
    display: flex;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-nav);
    padding: 7px 5px calc(7px + env(safe-area-inset-bottom));
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    background: rgba(12, 23, 38, 0.97);
    border-top: 1px solid rgba(113, 173, 255, 0.16);
    box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(12px);
  }
  .bottom-nav a {
    display: grid;
    flex: 0 0 25%;
    justify-items: center;
    gap: 3px;
    min-width: 25%;
    scroll-snap-align: start;
    color: #d2deec;
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
  }
  .bottom-nav a.router-link-active {
    color: var(--color-primary);
  }
  .nav-icon {
    font-size: 17px;
    line-height: 18px;
  }
  .bottom-nav a span:last-child {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
<style>
html {
  scrollbar-gutter: stable;
}
</style>
