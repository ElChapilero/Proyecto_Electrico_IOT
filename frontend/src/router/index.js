import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import RegistroView from "../views/RegistroView.vue";
import DashboardView from "../views/DashboardView.vue";
import InicioView from "../views/InicioView.vue";
import SectionPlaceholderView from "../views/SectionPlaceholderView.vue";
import AppShell from "../components/layout/AppShell.vue";
import { useAuthStore } from "../stores/authStore";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard/inicio" },
    { path: "/login", component: LoginView, meta: { publico: true } },
    { path: "/registro", component: RegistroView, meta: { publico: true } },
    {
      path: "/dashboard",
      component: AppShell,
      meta: { requiereAuth: true },
      children: [
        { path: "", redirect: "/dashboard/inicio" },
        { path: "inicio", component: InicioView },
        { path: "tiempo-real", component: DashboardView },
        {
          path: "resumen",
          component: SectionPlaceholderView,
          props: {
            title: "Resumen",
            description:
              "Aquí se incorporarán los indicadores históricos y comparativos del predio.",
          },
        },
        {
          path: "alertas",
          component: SectionPlaceholderView,
          props: {
            title: "Alertas",
            description:
              "La gestión de alertas quedará conectada cuando se validen sus contratos específicos.",
          },
        },
        {
          path: "historial",
          component: SectionPlaceholderView,
          props: {
            title: "Historial",
            description:
              "Aquí se visualizarán las mediciones históricas con filtros por predio, panel y circuito.",
          },
        },
        {
          path: "dispositivos",
          component: SectionPlaceholderView,
          props: {
            title: "Dispositivos",
            description:
              "La administración de paneles, ESP32 y circuitos se construirá sobre los endpoints reales.",
          },
        },
        {
          path: "configuracion",
          component: SectionPlaceholderView,
          props: {
            title: "Configuración",
            description:
              "Aquí podrás consultar y actualizar tu perfil cuando se habilite esa vista.",
          },
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.initialize();
  if (to.meta.requiereAuth && !auth.autenticado.value)
    return { path: "/login", query: { redirect: to.fullPath } };
  if (to.meta.publico && auth.autenticado.value) return "/dashboard";
});

export default router;
