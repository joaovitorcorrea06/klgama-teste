<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { RefreshCw, WifiOff } from '@lucide/vue';
import { restoreSession, session } from '../composables/useSession';
const router = useRouter();
const loading = ref(false);
async function retry(): Promise<void> {
  loading.value = true;
  try {
    await restoreSession();
    if (session.status !== 'unavailable') await router.replace(session.usuario ? '/painel' : '/login');
  } finally { loading.value = false; }
}
</script>

<template>
  <main
    id="conteudo"
    class="connection-state"
    tabindex="-1"
  >
    <WifiOff
      :size="36"
      aria-hidden="true"
    />
    <h1>Não conseguimos conectar.</h1>
    <p role="alert">
      {{ session.error }}
    </p>
    <button
      class="button-primary"
      type="button"
      :disabled="loading"
      @click="retry"
    >
      <RefreshCw
        :size="18"
        :class="{ spin: loading }"
        aria-hidden="true"
      />{{ loading ? 'Conectando…' : 'Tentar novamente' }}
    </button>
  </main>
</template>
