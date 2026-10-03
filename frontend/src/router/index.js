import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegistroView from '../views/RegistroView.vue';
import DashboardView from '../views/DashboardView.vue';
import AppShell from '../components/layout/AppShell.vue';
import { useAuthStore } from '../stores/authStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { publico: true } },
    { path: '/registro', component: RegistroView, meta: { publico: true } },
    { path: '/dashboard', component: AppShell, meta: { requiereAuth: true }, children: [{ path: '', component: DashboardView }] },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.initialize();
  if (to.meta.requiereAuth && !auth.autenticado.value) return { path: '/login', query: { redirect: to.fullPath } };
  if (to.meta.publico && auth.autenticado.value) return '/dashboard';
});

export default router;
