import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inicio', component: () => import('../pages/InicioPage.vue'), meta: { title: 'Portal de Coletas' } },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrada', component: () => import('../pages/NaoEncontradaPage.vue'), meta: { title: 'Página não encontrada' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? 'Portal de Coletas')} · EcoColeta`;
});
