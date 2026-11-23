import { createRouter, createWebHistory } from 'vue-router';
import { ensureSession, session } from '../composables/useSession';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/painel' },
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { title: 'Entrar', guestOnly: true } },
    { path: '/cadastro', name: 'cadastro', component: () => import('../pages/CadastroPage.vue'), meta: { title: 'Criar conta', guestOnly: true } },
    { path: '/painel', name: 'painel', component: () => import('../pages/PainelPage.vue'), meta: { title: 'Painel', requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrada', component: () => import('../pages/NaoEncontradaPage.vue'), meta: { title: 'Página não encontrada' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  await ensureSession();
  if (session.status === 'unavailable') return true;
  if (to.meta.requiresAuth && !session.usuario) return { name: 'login', query: { redirecionar: to.fullPath } };
  if (to.meta.guestOnly && session.usuario) return { name: 'painel' };
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? 'Portal de Coletas')} · EcoColeta`;
});
