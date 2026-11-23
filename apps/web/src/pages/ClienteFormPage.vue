<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { Building2, ChevronDown, Info, LoaderCircle, Save } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { showSuccess } from '../composables/useFeedback';
import { session } from '../composables/useSession';
import { ApiError } from '../services/api';
import { clientesApi, formatCnpj, ufs, type ClienteInput } from '../services/clientes';

const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.id || ''));
const editing = computed(() => !!id.value);
const data = reactive<ClienteInput>({ nome: '', cnpj: '', cidade: '', uf: '', ativo: true });
const original = ref(JSON.stringify(data));
const dirty = computed(() => JSON.stringify(data) !== original.value);
const cnpj = computed({ get: () => data.cnpj, set: (value: string) => { data.cnpj = formatCnpj(value); } });
const form = ref<HTMLFormElement>();
const feedbackElement = ref<HTMLElement>();
const errors = reactive<Record<string, string>>({});
const loading = ref(false);
const submitting = ref(false);
const loadError = ref('');
const error = ref('');
const possuiColetas = ref(false);
const leaveOpen = ref(false);
let leaveResolve: ((value: boolean) => void) | undefined;
let revision = 0;
let saved = false;

async function load(): Promise<void> {
  const current = ++revision;
  loadError.value = '';
  error.value = '';
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!id.value) { loading.value = false; possuiColetas.value = false; Object.assign(data, { nome: '', cnpj: '', cidade: '', uf: '', ativo: true }); original.value = JSON.stringify(data); return; }
  loading.value = true;
  try {
    const cliente = await clientesApi.buscar(id.value);
    if (current !== revision) return;
    Object.assign(data, { nome: cliente.nome, cnpj: formatCnpj(cliente.cnpj), cidade: cliente.cidade, uf: cliente.uf, ativo: cliente.ativo });
    possuiColetas.value = !!cliente.possuiColetas;
    original.value = JSON.stringify(data);
  } catch (failure) { if (current === revision) loadError.value = failure instanceof Error ? failure.message : 'Não foi possível carregar este cliente.'; }
  finally { if (current === revision) loading.value = false; }
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  Object.keys(errors).forEach((key) => delete errors[key]);
  error.value = '';
  if ([...data.nome.trim()].length < 2) errors.nome = 'Informe o nome do cliente com pelo menos 2 caracteres.';
  if (data.cnpj.replace(/\D/g, '').length !== 14) errors.cnpj = 'Informe os 14 dígitos do CNPJ.';
  if ([...data.cidade.trim()].length < 2) errors.cidade = 'Informe a cidade com pelo menos 2 caracteres.';
  if (!ufs.includes(data.uf)) errors.uf = 'Selecione uma UF.';
  if (Object.keys(errors).length) { await nextTick(); form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
  submitting.value = true;
  const payload = { ...data, nome: data.nome.trim(), cidade: data.cidade.trim(), cnpj: data.cnpj.replace(/\D/g, '') };
  try {
    const cliente = editing.value ? await clientesApi.atualizar(id.value, payload) : await clientesApi.criar(payload);
    saved = true;
    showSuccess(`Cliente “${cliente.nome}” ${editing.value ? 'atualizado' : 'cadastrado'} com sucesso.`);
    await router.push('/clientes');
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Não foi possível salvar o cliente.';
    if (failure instanceof ApiError) {
      for (const [field, messages] of Object.entries(failure.errors)) errors[field] = messages[0];
      if (failure.status === 409) errors.cnpj = 'Este CNPJ já pertence a outro cliente.';
    }
    await nextTick(); feedbackElement.value?.focus();
  } finally { submitting.value = false; }
}
function confirmLeave(): boolean | Promise<boolean> {
  if (!session.usuario || saved || !dirty.value) return true;
  if (submitting.value) return false;
  leaveResolve?.(false);
  leaveOpen.value = true;
  return new Promise<boolean>((resolve) => { leaveResolve = resolve; });
}
function answerLeave(value: boolean): void { leaveOpen.value = false; leaveResolve?.(value); leaveResolve = undefined; }
function beforeUnload(event: BeforeUnloadEvent): void { if (dirty.value && !saved && session.usuario) { event.preventDefault(); event.returnValue = ''; } }
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate(confirmLeave);
watch(id, () => { saved = false; void load(); }, { immediate: true });
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => { revision++; window.removeEventListener('beforeunload', beforeUnload); leaveResolve?.(false); });
</script>

<template>
  <PortalLayout>
    <nav
      class="breadcrumbs"
      aria-label="Localização"
    >
      <RouterLink to="/clientes">Clientes</RouterLink><span aria-hidden="true">/</span><span>{{ editing ? 'Editar cliente' : 'Novo cliente' }}</span>
    </nav>
    <div class="page-heading">
      <div>
        <p class="eyebrow">
          Base de clientes
        </p><h1>{{ editing ? 'Editar cliente' : 'Novo cliente' }}</h1><p class="page-description">
          {{ editing ? 'Mantenha os dados do cliente atualizados.' : 'Cadastre os dados para organizar as próximas coletas.' }}
        </p>
      </div>
    </div>
    <div
      v-if="loading"
      class="data-card form-card list-skeleton"
      role="status"
      aria-label="Carregando cliente"
    >
      <div
        v-for="row in 4"
        :key="row"
      />
    </div>
    <section
      v-else-if="loadError"
      class="data-card empty-state"
    >
      <Building2
        :size="32"
        aria-hidden="true"
      /><h2>Não foi possível abrir este cliente.</h2><p role="alert">
        {{ loadError }}
      </p><div class="dialog-actions">
        <RouterLink
          class="button-quiet"
          to="/clientes"
        >Voltar para clientes</RouterLink><button
          class="button-primary"
          type="button"
          @click="load"
        >
          Tentar novamente
        </button>
      </div>
    </section>
    <form
      v-else
      ref="form"
      class="client-form"
      novalidate
      :aria-busy="submitting"
      @submit.prevent="submit"
    >
      <p
        v-if="error"
        ref="feedbackElement"
        class="feedback feedback-error"
        role="alert"
        tabindex="-1"
      >
        {{ error }}
      </p>
      <fieldset
        class="data-card form-card"
        :disabled="submitting"
      >
        <legend class="sr-only">
          Dados do cliente
        </legend>
        <div class="card-heading">
          <span class="section-icon"><Building2
            :size="20"
            aria-hidden="true"
          /></span><div><h2>Dados do cliente</h2><p>Nome, CNPJ e localização são obrigatórios.</p></div>
        </div>
        <div class="client-form-grid">
          <div class="form-field form-wide">
            <label for="nome">Nome do cliente</label><input
              id="nome"
              v-model="data.nome"
              name="nome"
              autocomplete="organization"
              maxlength="160"
              placeholder="Ex.: Indústria Horizonte Fictícia"
              required
              :aria-invalid="!!errors.nome"
              :aria-describedby="errors.nome ? 'nome-error' : undefined"
            /><p
              v-if="errors.nome"
              id="nome-error"
              class="field-error"
            >
              {{ errors.nome }}
            </p>
          </div>
          <div class="form-field form-wide">
            <label for="cnpj">CNPJ</label><input
              id="cnpj"
              v-model="cnpj"
              name="cnpj"
              inputmode="numeric"
              maxlength="18"
              placeholder="00.000.000/0000-00"
              required
              :aria-invalid="!!errors.cnpj"
              :aria-describedby="errors.cnpj ? 'cnpj-error' : 'cnpj-hint'"
            /><p
              v-if="errors.cnpj"
              id="cnpj-error"
              class="field-error"
            >
              {{ errors.cnpj }}
            </p><p
              v-else
              id="cnpj-hint"
              class="field-hint"
            >
              Use somente dados fictícios nesta demonstração.
            </p>
          </div>
          <div class="form-field">
            <label for="cidade">Cidade</label><input
              id="cidade"
              v-model="data.cidade"
              name="cidade"
              autocomplete="address-level2"
              maxlength="120"
              placeholder="Informe a cidade"
              required
              :aria-invalid="!!errors.cidade"
              :aria-describedby="errors.cidade ? 'cidade-error' : undefined"
            /><p
              v-if="errors.cidade"
              id="cidade-error"
              class="field-error"
            >
              {{ errors.cidade }}
            </p>
          </div>
          <div class="form-field">
            <label for="uf">UF</label><div class="select-wrap">
              <select
                id="uf"
                v-model="data.uf"
                name="uf"
                autocomplete="address-level1"
                required
                :aria-invalid="!!errors.uf"
                :aria-describedby="errors.uf ? 'uf-error' : undefined"
              >
                <option
                  disabled
                  value=""
                >
                  Selecione
                </option><option
                  v-for="uf in ufs"
                  :key="uf"
                  :value="uf"
                >
                  {{ uf }}
                </option>
              </select><ChevronDown
                :size="16"
                aria-hidden="true"
              />
            </div><p
              v-if="errors.uf"
              id="uf-error"
              class="field-error"
            >
              {{ errors.uf }}
            </p>
          </div>
        </div>
        <div class="client-status-setting">
          <label
            class="checkbox-label"
            for="ativo"
          ><input
            id="ativo"
            v-model="data.ativo"
            name="ativo"
            type="checkbox"
          /><span>Cliente ativo<small>Clientes inativos permanecem no histórico e não recebem novas coletas.</small></span></label>
        </div>
        <p
          v-if="possuiColetas"
          class="form-info"
        >
          <Info
            :size="18"
            aria-hidden="true"
          />Este cliente possui coletas vinculadas. Você pode editar os dados ou inativá-lo, preservando o histórico.
        </p>
      </fieldset>
      <div class="form-bottom-actions">
        <RouterLink
          class="button-quiet"
          to="/clientes"
        >Cancelar</RouterLink><button
          class="button-primary"
          type="submit"
          :disabled="submitting"
        >
          <LoaderCircle
            v-if="submitting"
            :size="18"
            class="spin"
            aria-hidden="true"
          /><Save
            v-else
            :size="18"
            aria-hidden="true"
          />{{ submitting ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar cliente' }}
        </button>
      </div>
    </form>
    <ConfirmDialog
      :open="leaveOpen"
      title="Sair sem salvar?"
      description="Você tem alterações que ainda não foram salvas. Se sair agora, elas serão descartadas."
      confirm-label="Descartar alterações"
      danger
      @cancel="answerLeave(false)"
      @confirm="answerLeave(true)"
    />
  </PortalLayout>
</template>
