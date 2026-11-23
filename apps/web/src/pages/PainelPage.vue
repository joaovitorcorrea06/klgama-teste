<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LayoutDashboard, Leaf, LogOut, ShieldCheck } from '@lucide/vue';
import BrandMark from '../components/BrandMark.vue';
import { logout, session } from '../composables/useSession';

const router = useRouter();
const firstName = computed(() => session.usuario?.nome.split(' ')[0] || '');
const submitting = ref(false);
const error = ref('');
async function sair(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  try { await logout(); await router.replace('/login'); }
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
      <RouterLink to="/painel"><LayoutDashboard
        :size="18"
        aria-hidden="true"
      />Painel</RouterLink>
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
      <p class="eyebrow">
        Seu espaço de trabalho
      </p>
      <h1>Olá, {{ firstName }}.</h1>
      <p class="form-description">
        Bem-vindo ao seu portal de coletas.
      </p>
      <section
        class="portal-welcome"
        aria-labelledby="operacao-titulo"
      >
        <span class="welcome-symbol"><Leaf
          :size="32"
          aria-hidden="true"
        /></span>
        <h2 id="operacao-titulo">
          Mais clareza para sua operação.
        </h2>
        <p>A gestão de clientes, as coletas e os indicadores estarão disponíveis em breve.</p>
        <span class="session-label"><ShieldCheck
          :size="16"
          aria-hidden="true"
        /> Acesso autenticado</span>
      </section>
    </main>
    <footer class="site-footer">
      EcoColeta · Empresa fictícia para demonstração
    </footer>
  </div>
</template>
