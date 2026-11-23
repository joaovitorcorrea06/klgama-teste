<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { session } from './composables/useSession';
import SessionUnavailable from './components/SessionUnavailable.vue';
import { LoaderCircle } from '@lucide/vue';

const router = useRouter();
watch(() => session.status, (status, previous) => {
  if (status === 'anonymous' && previous === 'authenticated' && router.currentRoute.value.meta.requiresAuth) {
    void router.replace({ name: 'login', query: { motivo: 'sessao', redirecionar: router.currentRoute.value.fullPath } });
  }
});
</script>

<template>
  <a
    class="skip-link"
    href="#conteudo"
  >Ir para o conteúdo</a>
  <main
    v-if="session.status === 'unknown'"
    id="conteudo"
    class="connection-state"
    tabindex="-1"
    aria-busy="true"
  >
    <LoaderCircle
      class="spin"
      :size="30"
      aria-hidden="true"
    />
    <p role="status">
      Verificando seu acesso…
    </p>
  </main>
  <SessionUnavailable v-else-if="session.status === 'unavailable'" />
  <RouterView v-else />
</template>
