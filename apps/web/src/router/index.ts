import { createRouter, createWebHistory } from 'vue-router';
import { ensureSession, session } from '../composables/useSession';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/painel' },
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue'), meta: { title: 'Entrar', guestOnly: true } },
    { path: '/cadastro', name: 'cadastro', component: () => import('../pages/CadastroPage.vue'), meta: { title: 'Criar conta', guestOnly: true } },
    { path: '/painel', name: 'painel', component: () => import('../pages/PainelPage.vue'), meta: { title: 'Painel', requiresAuth: true } },
    { path: '/clientes', name: 'clientes', component: () => import('../pages/ClientesPage.vue'), meta: { title: 'Clientes', requiresAuth: true } },
    { path: '/clientes/novo', name: 'novo-cliente', component: () => import('../pages/ClienteFormPage.vue'), meta: { title: 'Novo cliente', requiresAuth: true } },
    { path: '/clientes/:id/editar', name: 'editar-cliente', component: () => import('../pages/ClienteFormPage.vue'), meta: { title: 'Editar cliente', requiresAuth: true } },
    { path: '/coletas', name: 'coletas', component: () => import('../pages/ColetasPage.vue'), meta: { title: 'Coletas', requiresAuth: true } },
    { path: '/coletas/nova', name: 'nova-coleta', component: () => import('../pages/ColetaFormPage.vue'), meta: { title: 'Nova coleta', requiresAuth: true } },
    { path: '/coletas/:id/editar', name: 'editar-coleta', component: () => import('../pages/ColetaFormPage.vue'), meta: { title: 'Detalhes da coleta', requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrada', component: () => import('../pages/NaoEncontradaPage.vue'), meta: { title: 'Página não encontrada' } },
  ],
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    if (to.name === 'painel' && from.name === 'painel' && to.query.inicio === from.query.inicio && to.query.fim === from.query.fim) return false;
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  await ensureSession();
  if (session.status === 'unavailable') return true;
  if (to.meta.requiresAuth && !session.usuario) return { name: 'login', query: { redirecionar: to.fullPath } };
  if (to.meta.guestOnly && session.usuario) return { name: 'painel' };
});

router.afterEach((to, _from, failure) => {
  if (failure) return;
  document.title = `${String(to.meta.title ?? 'Portal de Coletas')} · EcoColeta`;
});
