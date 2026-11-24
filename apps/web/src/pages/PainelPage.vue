<script setup lang="ts">
import { computed } from 'vue';
import { Leaf, UsersRound } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import { session } from '../composables/useSession';
const firstName = computed(() => session.usuario?.nome.split(' ')[0] || '');
</script>

<template>
  <PortalLayout>
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
        Sua operação começa pelos clientes.
      </h2>
      <p>Organize sua base de clientes e mantenha os dados atualizados. A gestão de coletas já está disponível no menu. O painel de indicadores será integrado na próxima etapa.</p>
      <RouterLink
        class="button-primary"
        to="/clientes"
      ><UsersRound
        :size="18"
        aria-hidden="true"
      />Gerenciar clientes</RouterLink>
    </section>
  </PortalLayout>
</template>
