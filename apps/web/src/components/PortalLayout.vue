<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CheckCircle2, LayoutDashboard, LogOut, Truck, UsersRound, X } from '@lucide/vue';
import BrandMark from './BrandMark.vue';
import { logout, session } from '../composables/useSession';
import { clearFeedback, feedback } from '../composables/useFeedback';

const route = useRoute();
const router = useRouter();
const submitting = ref(false);
const error = ref('');
async function sair(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  try { await logout(); clearFeedback(); await router.replace('/login'); }
  catch (failure) { error.value = failure instanceof Error ? failure.message : 'Não foi possível sair. Tente novamente.'; }
  finally { submitting.value = false; }
}
</script>

<template>
  <div class="portal-layout">
    <header class="portal-header">
      <RouterLink
        to="/painel"
        aria-label="EcoColeta, painel"
        class="brand-link"
      ><BrandMark /></RouterLink>
      <div class="portal-user">
        <span>{{ session.usuario?.nome }}</span><button
          class="button-quiet"
          type="button"
          :disabled="submitting"
          @click="sair"
        >
          <LogOut
            :size="18"
            aria-hidden="true"
          />{{ submitting ? 'Saindo…' : 'Sair' }}
        </button>
      </div>
    </header>
    <nav
      class="portal-navigation"
      aria-label="Navegação principal"
    >
      <RouterLink
        to="/painel"
        :class="{ active: route.path === '/painel' }"
      ><LayoutDashboard
        :size="18"
        aria-hidden="true"
      />Painel</RouterLink>
      <RouterLink
        to="/clientes"
        :class="{ active: route.path.startsWith('/clientes') }"
      ><UsersRound
        :size="18"
        aria-hidden="true"
      />Clientes</RouterLink>
      <RouterLink
        to="/coletas"
        :class="{ active: route.path.startsWith('/coletas') }"
      ><Truck
        :size="18"
        aria-hidden="true"
      />Coletas</RouterLink>
    </nav>
    <main
      id="conteudo"
      class="portal-content"
      tabindex="-1"
    >
      <p
        v-if="error"
        class="feedback feedback-error"
        role="alert"
      >
        {{ error }}
      </p>
      <div
        v-if="feedback"
        class="feedback feedback-success success-message"
        role="status"
      >
        <CheckCircle2
          :size="19"
          aria-hidden="true"
        /><span>{{ feedback }}</span><button
          type="button"
          class="icon-button"
          aria-label="Fechar mensagem"
          @click="clearFeedback"
        >
          <X
            :size="18"
            aria-hidden="true"
          />
        </button>
      </div>
      <slot />
    </main>
    <footer class="site-footer">
      EcoColeta · Empresa fictícia para demonstração
    </footer>
  </div>
</template>
