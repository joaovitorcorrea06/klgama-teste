<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LoaderCircle, UserRoundPlus } from '@lucide/vue';
import AuthLayout from '../components/AuthLayout.vue';
import PasswordField from '../components/PasswordField.vue';
import { registrationNotice } from '../composables/useSession';
import { ApiError, apiRequest } from '../services/api';

const router = useRouter();
const form = ref<HTMLFormElement>();
const feedback = ref<HTMLElement>();
const data = reactive({ nome: '', email: '', senha: '', confirmacao: '' });
const errors = reactive<Record<string, string>>({});
const error = ref('');
const submitting = ref(false);

async function submit(): Promise<void> {
  if (submitting.value) return;
  Object.keys(errors).forEach((key) => delete errors[key]);
  error.value = '';
  if ([...data.nome.trim()].length < 2) errors.nome = 'Informe seu nome com pelo menos 2 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Informe um e-mail válido.';
  if ([...data.senha].length < 10) errors.senha = 'Use uma senha com pelo menos 10 caracteres.';
  else if (new TextEncoder().encode(data.senha).length > 72) errors.senha = 'A senha é muito longa. Use até 72 bytes.';
  if (data.confirmacao !== data.senha || !data.confirmacao) errors.confirmacao = 'As senhas precisam ser iguais.';
  if (Object.keys(errors).length) {
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await apiRequest('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome: data.nome.trim(), email: data.email.trim().toLowerCase(), senha: data.senha }) }, false);
    registrationNotice.email = data.email.trim().toLowerCase();
    data.senha = '';
    data.confirmacao = '';
    await router.replace({ name: 'login', query: { cadastro: 'sucesso' } });
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Não foi possível criar a conta. Tente novamente.';
    if (failure instanceof ApiError) {
      for (const [field, messages] of Object.entries(failure.errors)) errors[field] = messages[0];
      if (failure.status === 409) errors.email = 'Este e-mail já está cadastrado.';
    }
    await nextTick();
    feedback.value?.focus();
  } finally { submitting.value = false; }
}
</script>

<template>
  <AuthLayout>
    <span class="form-eyebrow"><UserRoundPlus
      :size="16"
      aria-hidden="true"
    /> Comece por aqui</span>
    <h1>Crie sua conta.</h1>
    <p class="form-description">
      Seu primeiro passo para uma operação mais conectada.
    </p>
    <form
      ref="form"
      class="auth-form"
      novalidate
      :aria-busy="submitting"
      @submit.prevent="submit"
    >
      <p
        v-if="error"
        ref="feedback"
        class="feedback feedback-error"
        role="alert"
        tabindex="-1"
      >
        {{ error }}
      </p>
      <div class="form-field">
        <label for="nome">Nome</label>
        <input
          id="nome"
          v-model="data.nome"
          :disabled="submitting"
          name="nome"
          autocomplete="name"
          maxlength="120"
          placeholder="Como podemos chamar você?"
          required
          :aria-invalid="!!errors.nome"
          :aria-describedby="errors.nome ? 'nome-error' : undefined"
        />
        <p
          v-if="errors.nome"
          id="nome-error"
          class="field-error"
        >
          {{ errors.nome }}
        </p>
      </div>
      <div class="form-field">
        <label for="email">E-mail</label>
        <input
          id="email"
          v-model="data.email"
          :disabled="submitting"
          type="email"
          :spellcheck="false"
          name="email"
          autocomplete="email"
          inputmode="email"
          maxlength="254"
          placeholder="voce@empresa.com"
          required
          :aria-invalid="!!errors.email"
          :aria-describedby="errors.email ? 'email-error' : undefined"
        />
        <p
          v-if="errors.email"
          id="email-error"
          class="field-error"
        >
          {{ errors.email }}
        </p>
      </div>
      <PasswordField
        id="senha"
        v-model="data.senha"
        :disabled="submitting"
        autocomplete="new-password"
        hint="Use pelo menos 10 caracteres. Prefira uma frase que você consiga lembrar."
        :error="errors.senha"
      />
      <PasswordField
        id="confirmacao"
        v-model="data.confirmacao"
        :disabled="submitting"
        label="Confirmar senha"
        autocomplete="new-password"
        :error="errors.confirmacao"
      />
      <button
        class="button-primary auth-submit"
        type="submit"
        :disabled="submitting"
      >
        <LoaderCircle
          v-if="submitting"
          class="spin"
          :size="18"
          aria-hidden="true"
        />{{ submitting ? 'Criando conta…' : 'Criar minha conta' }}
      </button>
    </form>
    <p class="auth-switch">
      Já tem uma conta? <RouterLink to="/login">Entrar no portal</RouterLink>
    </p>
  </AuthLayout>
</template>
