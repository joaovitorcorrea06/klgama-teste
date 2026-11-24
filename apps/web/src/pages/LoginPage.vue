<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle, LockKeyhole } from '@lucide/vue';
import AuthLayout from '../components/AuthLayout.vue';
import PasswordField from '../components/PasswordField.vue';
import { login, registrationNotice } from '../composables/useSession';
import { ApiError } from '../services/api';

const route = useRoute();
const router = useRouter();
const form = ref<HTMLFormElement>();
const feedback = ref<HTMLElement>();
const data = reactive({ email: registrationNotice.email, senha: '' });
const errors = reactive<Record<string, string>>({});
const error = ref('');
const submitting = ref(false);

async function submit(): Promise<void> {
  if (submitting.value) return;
  Object.keys(errors).forEach((key) => delete errors[key]);
  error.value = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Informe um e-mail válido.';
  if (!data.senha) errors.senha = 'Informe sua senha.';
  if (Object.keys(errors).length) {
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  submitting.value = true;
  try {
    await login(data.email.trim().toLowerCase(), data.senha);
    data.senha = '';
    registrationNotice.email = '';
    const target = typeof route.query.redirecionar === 'string' ? route.query.redirecionar : '/painel';
    const destination = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') && router.resolve(target).meta.requiresAuth ? target : '/painel';
    await router.replace(destination);
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Não foi possível entrar. Tente novamente.';
    if (failure instanceof ApiError) for (const [field, messages] of Object.entries(failure.errors)) errors[field] = messages[0];
    await nextTick();
    feedback.value?.focus();
  } finally { submitting.value = false; }
}
</script>

<template>
  <AuthLayout>
    <span class="form-eyebrow"><LockKeyhole
      :size="15"
      aria-hidden="true"
    /> Acesso ao portal</span>
    <h1>Bem-vindo de volta.</h1>
    <p class="form-description">
      Entre na sua conta para acompanhar sua operação.
    </p>
    <p
      v-if="route.query.cadastro === 'sucesso'"
      class="feedback feedback-success"
      role="status"
    >
      Conta criada. Entre com seu e-mail e senha para continuar.
    </p>
    <p
      v-else-if="route.query.motivo === 'sessao'"
      class="feedback"
      role="status"
    >
      Sua sessão terminou. Entre novamente para continuar.
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
        <label for="email">E-mail</label>
        <input
          id="email"
          v-model="data.email"
          :disabled="submitting"
          type="email"
          :spellcheck="false"
          name="email"
          autocomplete="username"
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
        autocomplete="current-password"
        :error="errors.senha"
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
        />{{ submitting ? 'Entrando…' : 'Entrar no portal' }}
      </button>
    </form>
    <p class="auth-switch">
      Ainda não tem uma conta? <RouterLink to="/cadastro">Criar conta</RouterLink>
    </p>
    <p class="auth-security">
      <LockKeyhole
        :size="14"
        aria-hidden="true"
      /> Seu acesso é pessoal e protegido.
    </p>
  </AuthLayout>
</template>
