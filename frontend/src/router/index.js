import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegistroView from '../views/RegistroView.vue';
import AppShell from '../components/layout/AppShell.vue';
import ResumenView from '../views/ResumenView.vue';
import DispositivosView from '../views/DispositivosView.vue';
import PlaceholderView from '../views/PlaceholderView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView },
    { path: '/registro', component: RegistroView },
    {
      path: '/dashboard',
      component: AppShell,
      meta: { requiereAuth: true },
      children: [
        { path: '', redirect: '/dashboard/resumen' },
        { path: 'resumen', component: ResumenView },
        { path: 'alertas', component: PlaceholderView, props: { titulo: 'Alertas' } },
        { path: 'historial', component: PlaceholderView, props: { titulo: 'Historial' } },
        { path: 'dispositivos', component: DispositivosView },
        { path: 'configuraciones', component: PlaceholderView, props: { titulo: 'Configuraciones' } },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const haySesion = !!localStorage.getItem('token');
  if (to.meta.requiereAuth && !haySesion) {
    return '/login';
  }
});

export default router;
