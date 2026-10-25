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
    <section class="section-heading variables-heading">
      <div>
        <span class="eyebrow">Lecturas del sistema</span>
        <h3>Variables eléctricas</h3>
      </div>
      <p>
        Conoce los valores que describen el comportamiento de la electricidad
        en tu hogar.
      </p>
    </section>
    <section class="variables-intro page-card">
      <p>
        Las variables eléctricas nos ayudan a entender cómo se comporta la
        electricidad en los circuitos de tu hogar. Al medirlas desde el
        breaker, podemos conocer cuánta electricidad circula por cada circuito,
        cuánto consume a lo largo del tiempo y si sus valores se mantienen
        dentro de los rangos esperados.
      </p>
    </section>
    <section class="variables-grid" aria-label="Variables eléctricas">
      <article
        v-for="variable in electricalVariables"
        :key="variable.label"
        class="variable-card page-card"
        :style="{ '--variable-color': variable.color }"
      >
        <div class="variable-card-header">
          <h4>{{ variable.label }}</h4>
          <span class="variable-unit">{{ variable.unit }}</span>
        </div>
        <p>{{ variable.description }}</p>
      </article>
    </section>
    <section class="section-heading quick-heading">
      <div>
        <span class="eyebrow">Accesos rápidos</span>
        <h3>Explora tu sistema</h3>
      </div>
    </section>
    <section class="quick-grid">
      <template v-for="item in quickLinks" :key="item.path">
        <button
          v-if="item.modal"
          type="button"
          class="quick-card page-card"
          @click="openQuickModal(item)"
          ><span class="quick-icon">{{ item.icon }}</span
          ><span
            ><strong>{{ item.label }}</strong
            ><small>{{ item.description }}</small></span
          ><b>→</b>
        </button>
        <router-link
          v-else
          class="quick-card page-card"
          :to="item.path"
          ><span class="quick-icon">{{ item.icon }}</span
          ><span
            ><strong>{{ item.label }}</strong
            ><small>{{ item.description }}</small></span
          ><b>→</b></router-link
        >
      </template>
    </section>
    <BaseModal
      v-if="activeQuickModal"
      :title="activeQuickModal.title"
      @close="closeQuickModal"
    >
      <div class="quick-modal-content">
        <p class="quick-modal-intro">{{ activeQuickModal.intro }}</p>
        <div
          v-for="section in activeQuickModal.sections"
          :key="section.title"
          class="quick-modal-section"
        >
          <h3>{{ section.title }}</h3>
          <p v-if="section.text">{{ section.text }}</p>
          <ul v-if="section.items">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="quick-modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeQuickModal">
            Cerrar
          </button>
          <router-link
            class="btn btn-primary"
            :to="activeQuickModal.path"
            @click="closeQuickModal"
          >
            Ir
          </router-link>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref } from "vue";
import BaseModal from "../components/common/BaseModal.vue";

const activeQuickModal = ref(null);

const openQuickModal = (item) => {
  activeQuickModal.value = item.modal;
};

const closeQuickModal = () => {
  activeQuickModal.value = null;
};

const flow = [
  { name: "PZEM", detail: "Mide", icon: "◉" },
  { name: "ESP32", detail: "Procesa", icon: "⌁" },
  { name: "MQTT", detail: "Transporta", icon: "↗" },
  { name: "Backend", detail: "Valida", icon: "⌘" },
  { name: "PostgreSQL", detail: "Guarda", icon: "▣" },
  { name: "Aplicación web", detail: "Presenta", icon: "◌" },
];
const electricalVariables = [
  {
    label: "Energía",
    unit: "kWh",
    color: "#39FF14",
    description:
      "Indica cuánta electricidad se ha consumido durante un periodo de tiempo. Se utiliza para hacer seguimiento del consumo y estimar el consumo de la energía.",
  },
  {
    label: "Potencia",
    unit: "W",
    color: "#DFFF00",
    description:
      "Representa la cantidad de energía que los equipos están utilizando en un momento determinado. Permite conocer cómo cambia la demanda eléctrica cuando se encienden o apagan equipos.",
  },
  {
    label: "Voltaje",
    unit: "V",
    color: "#FF3131",
    description:
      "Indica la fuerza con la que circula la electricidad. Medirlo permite comprobar si se mantiene dentro del rango esperado para el funcionamiento de los equipos conectados a ese circuito.",
  },
  {
    label: "Corriente",
    unit: "A",
    color: "#7B2CFF",
    description:
      "Muestra cuánta electricidad está circulando por el circuito. Se utiliza para conocer la carga conectada y detectar consumos elevados.",
  },
  {
    label: "Factor de potencia",
    unit: "FP",
    color: "#FF6A00",
    description:
      "Indica qué tan eficientemente se está utilizando la electricidad. Un valor cercano a 1 significa que la energía se está aprovechando mejor.",
  },
];
const quickLinks = [
  {
    path: "/dashboard/tiempo-real",
    label: "Tiempo real",
    description: "Estado actual",
    icon: "⌁",
    modal: {
      title: "¿Cómo funciona el monitoreo en tiempo real?",
      path: "/dashboard/tiempo-real",
      intro:
        "Consulta las mediciones eléctricas de tu hogar y observa cómo cambian con el tiempo.",
      sections: [
        {
          title: "¿Para qué sirven los filtros?",
          items: [
            "Panel: selecciona el panel eléctrico que deseas consultar.",
            "Circuito: elige un circuito, o compara los circuitos del panel seleccionado.",
            "Mostrar últimos: selecciona los últimos 1, 2 o 5 minutos para consultar las mediciones de ese periodo.",
          ],
        },
        {
          title: "¿Qué puedes visualizar?",
          text:
            "Consulta el voltaje (V), la corriente (A), la potencia (W), el factor de potencia (FP) y la energía consumida (kWh) de cada circuito. Las mediciones y las gráficas se actualizan a medida que llegan nuevos datos.",
        },
      ],
    },
  },
  {
    path: "/dashboard/resumen",
    label: "Resumen",
    description: "Indicadores",
    icon: "◒",
    modal: {
      title: "¿Cómo funciona el resumen?",
      path: "/dashboard/resumen",
      intro:
        "Consulta los indicadores de consumo de tu sistema eléctrico para conocer cuánto voltaje (V), corriente (A), potencia (W), factor de potencia (FP) o energía consumida (kWh) se ha utilizado y cómo se distribuye durante el periodo seleccionado.",
      sections: [
        {
          title: "¿Para qué sirven los filtros?",
          items: [
            "Panel: selecciona el panel eléctrico que quieres visualizar.",
            "Circuito: elige un circuito, o Circuitos juntos para comparar sus consumos.",
            "Período: selecciona Día, Semana o Mes para consultar la información.",
            "Fecha: elige el día, la semana o el mes según el periodo seleccionado.",
          ],
        },
        {
          title: "¿Qué puedes visualizar?",
          text:
            "Consulta el consumo acumulado, la energía inicial y el día de mayor consumo. También puedes observar la gráfica para comparar el consumo de energía entre los días del periodo elegido y cambiar los filtros en cualquier momento.",
        },
      ],
    },
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
    modal: {
      title: "¿Cómo funciona el historial?",
      path: "/dashboard/historial",
      intro:
        "Consulta las mediciones guardadas de tu sistema eléctrico y revisa cómo ha cambiado el consumo a lo largo del tiempo.",
      sections: [
        {
          title: "¿Para qué sirven los filtros?",
          items: [
            "Panel: selecciona el panel eléctrico que quieres consultar.",
            "Circuito: elige Cocina, Sala o Circuitos juntos para comparar sus mediciones.",
            "Variable: escoge voltaje (V), corriente (A), potencia (W), factor de potencia (FP) o energía consumida (kWh).",
            "Fecha inicial y final: selecciona el periodo que deseas consultar.",
            "Mostrar por: organiza el detalle de las mediciones por hora o por día.",
          ],
        },
        {
          title: "¿Qué puedes visualizar?",
          text:
            "Observa las mediciones en la gráfica y consulta los valores detallados en la tabla inferior. También puedes desplazarte horizontalmente en la gráfica para revisar otros momentos del periodo seleccionado.",
        },
      ],
    },
  },
  {
    path: "/dashboard/dispositivos",
    label: "Dispositivos",
    description: "Paneles y circuitos",
    icon: "⌗",
    modal: {
      title: "Dispositivos y estructura",
      path: "/dashboard/dispositivos",
      intro:
        "Aquí puedes organizar tu vivienda y administrar sus paneles, dispositivos ESP32 y circuitos eléctricos.",
      sections: [
        {
          title: "¿Qué puedes hacer?",
          items: [
            "Agregar un predio: registra una vivienda en el sistema.",
            "Vincular dispositivo: conecta un dispositivo ESP32 a tu sistema.",
            "Agregar panel principal o secundario: organiza los paneles eléctricos de tu vivienda.",
            "Renombrar: cambia el nombre de un predio, panel, dispositivo o circuito.",
            "Mover: cambia el panel al que está asignado un dispositivo.",
            "Eliminar: quita un elemento del sistema.",
          ],
        },
        {
          title: "¿Cómo se organiza?",
          text:
            "La estructura funciona de forma jerárquica: Predio → Panel eléctrico → Dispositivo ESP32 → Circuitos. Así puedes identificar dónde está cada dispositivo y qué circuitos eléctricos monitorea. Consejo: antes de eliminar un elemento, verifica que ya no lo necesites en tu sistema.",
        },
      ],
    },
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
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 13px;
}

.flow-step small {
  color: var(--color-muted);
  font-size: 13px;
}

.variables-heading {
  margin-top: 4px;
}

.variables-intro {
  padding: 18px 22px;
}

.variables-intro p {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.65;
  max-width: 900px;
}

.variables-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.variable-card {
  min-height: 190px;
  padding: 18px;
  border-color: color-mix(in srgb, var(--variable-color) 22%, transparent);
  border-top: 3px solid var(--variable-color);
  transition:
    transform var(--transition),
    border-color var(--transition);
}

.variable-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--variable-color) 62%, transparent);
  border-top-color: var(--variable-color);
}

.variable-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.variable-unit {
  color: var(--variable-color);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.variable-card h4 {
  color: #dceaff;
  font-size: 15px;
}

.variable-card p {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
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
  font-size: 13px;
  color: var(--color-muted);
}

.quick-card > b {
  color: var(--color-primary);
  font-size: 18px;
}

.quick-modal-content {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
}

.quick-modal-intro,
.quick-modal-section p {
  margin: 0;
}

.quick-modal-section {
  margin-top: 18px;
}

.quick-modal-section h3 {
  color: #c8ddfb;
  font-size: 14px;
  margin-bottom: 7px;
}

.quick-modal-section ul {
  margin: 0;
  padding-left: 19px;
}

.quick-modal-section li + li {
  margin-top: 5px;
}

.quick-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
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

  .variables-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .variables-grid {
    grid-template-columns: 1fr;
  }

}
</style>
