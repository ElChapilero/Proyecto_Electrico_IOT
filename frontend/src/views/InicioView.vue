<template>
  <div class="home-view">
    <section class="hero page-card">
      <div class="hero-copy">
        <span class="eyebrow">Bienvenido a Vatio</span>
        <h2>Tu energía, más clara y conectada.</h2>
        <p>
          Monitorea el comportamiento eléctrico de tus predios desde un solo
          lugar, con información preparada para crecer junto con tu sistema IoT.
        </p>
        <router-link class="btn btn-primary" to="/dashboard/tiempo-real"
          >Ver tiempo real</router-link
        >
      </div>
      <div class="hero-orbit" aria-hidden="true">
        <span>⚡</span><i></i><b></b>
      </div>
    </section>
    <section class="section-heading">
      <div>
        <span class="eyebrow">Cómo funciona</span>
        <h3>Del sensor a tu pantalla</h3>
      </div>
      <p>Una cadena segura para convertir mediciones en decisiones.</p>
    </section>
    <section class="flow page-card">
      <div v-for="(step, index) in flow" :key="step.name" class="flow-step">
        <span class="flow-icon">{{ step.icon }}</span
        ><strong>{{ step.name }}</strong
        ><small>{{ step.detail }}</small
        ><b v-if="index < flow.length - 1">→</b>
      </div>
    </section>
    <section class="section-heading quick-heading">
      <div>
        <span class="eyebrow">Accesos rápidos</span>
        <h3>Explora tu sistema</h3>
      </div>
    </section>
    <section class="quick-grid">
      <router-link
        v-for="item in quickLinks"
        :key="item.path"
        class="quick-card page-card"
        :to="item.path"
        ><span class="quick-icon">{{ item.icon }}</span
        ><span
          ><strong>{{ item.label }}</strong
          ><small>{{ item.description }}</small></span
        ><b>→</b></router-link
      >
    </section>
    <section class="guide page-card">
      <div class="guide-number">01</div>
      <div>
        <span class="eyebrow">Guía de uso</span>
        <h3>Selecciona un predio para empezar</h3>
        <p>
          Usa el selector superior para cambiar el contexto de trabajo. Las
          próximas vistas cargarán únicamente información perteneciente al
          predio seleccionado.
        </p>
      </div>
      <router-link class="btn btn-ghost" to="/dashboard/configuracion"
        >Ver configuración</router-link
      >
    </section>
  </div>
</template>
<script setup>
const flow = [
  { name: "PZEM", detail: "Mide", icon: "◉" },
  { name: "ESP32", detail: "Procesa", icon: "⌁" },
  { name: "MQTT", detail: "Transporta", icon: "↗" },
  { name: "Backend", detail: "Valida", icon: "⌘" },
  { name: "PostgreSQL", detail: "Guarda", icon: "▣" },
  { name: "Aplicación web", detail: "Presenta", icon: "◌" },
];
const quickLinks = [
  {
    path: "/dashboard/tiempo-real",
    label: "Tiempo real",
    description: "Estado actual",
    icon: "⌁",
  },
  {
    path: "/dashboard/resumen",
    label: "Resumen",
    description: "Indicadores",
    icon: "◒",
  },
  {
    path: "/dashboard/alertas",
    label: "Alertas",
    description: "Eventos importantes",
    icon: "!",
  },
  {
    path: "/dashboard/historial",
    label: "Historial",
    description: "Mediciones guardadas",
    icon: "◷",
  },
  {
    path: "/dashboard/dispositivos",
    label: "Dispositivos",
    description: "Paneles y circuitos",
    icon: "⌗",
  },
  {
    path: "/dashboard/configuracion",
    label: "Configuración",
    description: "Tu perfil",
    icon: "⚙",
  },
];
</script>
<style scoped>
.home-view {
  display: grid;
  gap: 22px;
}

.hero {
  min-height: 270px;
  padding: 32px 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
}

.hero-copy {
  max-width: 590px;
  position: relative;
  z-index: 1;
}

.eyebrow {
  color: var(--color-primary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.hero h2 {
  color: #b9d7ff;
  font-size: 34px;
  line-height: 1.13;
  margin-top: 9px;
  max-width: 520px;
}

.hero p {
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.65;
  margin: 14px 0 23px;
  max-width: 530px;
}

.hero-orbit {
  width: 240px;
  height: 240px;
  margin-right: 35px;
  border: 1px solid rgba(113, 173, 255, 0.22);
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  background: radial-gradient(
    circle,
    rgba(113, 173, 255, 0.18),
    transparent 62%
  );
  box-shadow: 0 0 70px rgba(66, 132, 222, 0.16);
}

.hero-orbit:before,
.hero-orbit:after {
  content: "";
  position: absolute;
  border: 1px solid rgba(113, 173, 255, 0.16);
  border-radius: 50%;
}

.hero-orbit:before {
  inset: 20px;
}

.hero-orbit:after {
  inset: -22px;
}

.hero-orbit span {
  font-size: 44px;
  color: #e9f4ff;
  text-shadow: 0 0 25px #71adff;
}

.hero-orbit i,
.hero-orbit b {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 15px var(--color-primary);
}

.hero-orbit i {
  top: 18px;
  right: 42px;
}

.hero-orbit b {
  bottom: 28px;
  left: 28px;
  background: var(--color-success);
  box-shadow: 0 0 15px var(--color-success);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
}

.section-heading h3 {
  color: #c8ddfb;
  font-size: 20px;
  margin-top: 7px;
}

.section-heading p {
  color: var(--color-muted);
  font-size: 12px;
}

.flow {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  padding: 18px 12px;
  gap: 4px;
}

.flow-step {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 6px;
  position: relative;
  padding: 4px 8px;
}

.flow-step b {
  position: absolute;
  right: -5px;
  top: 16px;
  color: var(--color-primary);
  font-size: 18px;
}

.flow-icon,
.quick-icon {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
}

.flow-icon {
  width: 36px;
  height: 36px;
  font-size: 16px;
}

.flow-step strong {
  color: #dceaff;
  font-size: 12px;
}

.flow-step small {
  color: var(--color-muted);
  font-size: 10px;
}

.quick-heading {
  margin-top: 4px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  text-decoration: none;
  transition:
    transform var(--transition),
    border-color var(--transition);
}

.quick-card:hover {
  transform: translateY(-2px);
  border-color: rgba(113, 173, 255, 0.5);
}

.quick-icon {
  width: 36px;
  height: 36px;
  flex: none;
}

.quick-card span:nth-child(2) {
  display: grid;
  gap: 5px;
  flex: 1;
}

.quick-card strong {
  font-size: 13px;
  color: #dceaff;
}

.quick-card small {
  font-size: 11px;
  color: var(--color-muted);
}

.quick-card > b {
  color: var(--color-primary);
  font-size: 18px;
}

.guide {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
}

.guide-number {
  font: 700 29px var(--font-display);
  color: rgba(113, 173, 255, 0.45);
}

.guide h3 {
  color: #c8ddfb;
  font-size: 16px;
  margin-top: 6px;
}

.guide p {
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.5;
  margin-top: 6px;
  max-width: 650px;
}

.guide .btn {
  margin-left: auto;
  white-space: nowrap;
}

@media (max-width: 850px) {
  .hero {
    padding: 26px;
  }

  .hero-orbit {
    width: 170px;
    height: 170px;
    margin-right: 0;
  }

  .flow {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 18px;
  }

  .flow-step:nth-child(3) b {
    display: none;
  }

  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .hero {
    min-height: 0;
    padding: 24px;
    display: block;
  }

  .hero h2 {
    font-size: 28px;
  }

  .hero-orbit {
    display: none;
  }

  .section-heading {
    display: block;
  }

  .section-heading p {
    margin-top: 8px;
  }

  .flow {
    grid-template-columns: repeat(2, 1fr);
  }

  .flow-step b {
    display: none;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }

  .guide {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .guide .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>
