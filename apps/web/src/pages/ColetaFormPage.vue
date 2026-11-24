<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { CalendarDays, FileCheck2, Info, LoaderCircle, Save, Truck } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ClientePicker from '../components/ClientePicker.vue';
import ResiduoField from '../components/ResiduoField.vue';
import { showSuccess } from '../composables/useFeedback';
import { session } from '../composables/useSession';
import { ApiError } from '../services/api';
import { coletasApi, decimalInput, formatDate, formatDecimal, validDate, type Coleta, type ColetaInput } from '../services/coletas';

const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.id || ''));
const editing = computed(() => !!id.value);
const blank = (): ColetaInput => ({ clienteId: '', numeroMtr: '', tipoResiduo: '', dataAgendada: '', valorReceita: '0,00', valorDespesa: '0,00', observacao: '' });
const data = reactive(blank());
const original = ref(JSON.stringify(data));
const dirty = computed(() => JSON.stringify(data) !== original.value);
const coleta = ref<Coleta>();
const final = computed(() => !!coleta.value && coleta.value.status !== 'Agendada');
const form = ref<HTMLFormElement>();
const feedbackElement = ref<HTMLElement>();
const errors = reactive<Record<string, string>>({});
const loading = ref(false);
const submitting = ref(false);
const loadError = ref('');
const error = ref('');
const leaveOpen = ref(false);
let leaveResolve: ((value: boolean) => void) | undefined;
let revision = 0;
let saved = false;
const fields = [
  { key: 'numeroMtr', label: 'Número do MTR', type: 'text', max: 80, placeholder: 'Ex.: MTR-2026-001', hint: 'Identificador único do manifesto.', decimal: false },
  { key: 'dataAgendada', label: 'Data agendada', type: 'date', max: 10, placeholder: '', hint: 'Data prevista para a coleta.', decimal: false },
  { key: 'valorReceita', label: 'Receita (R$)', type: 'text', max: 15, placeholder: '0,00', hint: 'Valor previsto de receita. Use até 2 casas decimais.', decimal: true },
  { key: 'valorDespesa', label: 'Despesa (R$)', type: 'text', max: 15, placeholder: '0,00', hint: 'Custo previsto da operação. Use até 2 casas decimais.', decimal: true },
] as const;
async function load(): Promise<void> {
  const current = ++revision;
  loadError.value = ''; error.value = ''; coleta.value = undefined;
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!id.value) { loading.value = false; Object.assign(data, blank()); original.value = JSON.stringify(data); return; }
  loading.value = true;
  try {
    const result = await coletasApi.buscar(id.value);
    if (current !== revision) return;
    coleta.value = result;
    Object.assign(data, { clienteId: result.clienteId, numeroMtr: result.numeroMtr, tipoResiduo: result.tipoResiduo, dataAgendada: result.dataAgendada, valorReceita: result.valorReceita.replace('.', ','), valorDespesa: result.valorDespesa.replace('.', ','), observacao: result.observacao ?? '' });
    original.value = JSON.stringify(data);
  } catch (failure) { if (current === revision) loadError.value = failure instanceof Error ? failure.message : 'Não foi possível carregar esta coleta.'; }
  finally { if (current === revision) loading.value = false; }
}
async function submit(): Promise<void> {
  if (submitting.value) return;
  Object.keys(errors).forEach((key) => delete errors[key]); error.value = '';
  const receita = decimalInput(data.valorReceita, 2, 12);
  const despesa = decimalInput(data.valorDespesa, 2, 12);
  if (!final.value) {
    if (!data.clienteId) errors.clienteId = 'Selecione um cliente ativo.';
    if (!data.numeroMtr.trim()) errors.numeroMtr = 'Informe o número do MTR.';
    if (data.tipoResiduo.trim().length < 2) errors.tipoResiduo = 'Informe o tipo de resíduo com pelo menos 2 caracteres.';
    if (!validDate(data.dataAgendada)) errors.dataAgendada = 'Informe uma data válida.';
    if (receita === null) errors.valorReceita = 'Informe um valor não negativo, sem milhar e com até 2 casas decimais.';
    if (despesa === null) errors.valorDespesa = 'Informe um valor não negativo, sem milhar e com até 2 casas decimais.';
  }
  if (Object.keys(errors).length) { await nextTick(); form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
  submitting.value = true;
  const payload: ColetaInput = { ...data, numeroMtr: data.numeroMtr.trim(), tipoResiduo: data.tipoResiduo.trim(), valorReceita: receita!, valorDespesa: despesa! };
  try {
    const result = editing.value ? await coletasApi.atualizar(id.value, final.value ? { observacao: data.observacao } : payload) : await coletasApi.criar(payload);
    saved = true;
    showSuccess(`${result.numeroMtr}: coleta ${editing.value ? 'atualizada' : 'agendada'} com sucesso.`);
    await router.push('/coletas');
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Não foi possível salvar a coleta.';
    if (failure instanceof ApiError) {
      for (const [field, messages] of Object.entries(failure.errors)) errors[field] = messages[0];
      if (failure.status === 409 && !final.value) error.value += ' Se a situação mudou, recarregue a página antes de editar.';
    }
    await nextTick(); feedbackElement.value?.focus();
  } finally { submitting.value = false; }
}
function confirmLeave(): boolean | Promise<boolean> {
  if (!session.usuario || saved || !dirty.value) return true;
  if (submitting.value) return false;
  leaveResolve?.(false); leaveOpen.value = true;
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
      <RouterLink to="/coletas">Coletas</RouterLink><span aria-hidden="true">/</span><span>{{ editing ? 'Detalhes e edição' : 'Nova coleta' }}</span>
    </nav>
    <div class="page-heading">
      <div>
        <p class="eyebrow">
          Gestão e rastreabilidade
        </p><h1>{{ editing ? 'Detalhes da coleta' : 'Nova coleta' }}</h1><p class="page-description">
          {{ editing ? 'Confira os documentos e mantenha o registro atualizado.' : 'Organize o agendamento, os valores e o resíduo que será destinado.' }}
        </p>
      </div><span
        v-if="coleta"
        class="status-badge"
        :class="coleta.status === 'Realizada' ? 'status-active' : coleta.status === 'Agendada' ? 'status-scheduled' : 'status-inactive'"
      >{{ coleta.status }}</span>
    </div>
    <div
      v-if="loading"
      class="data-card list-skeleton"
      role="status"
      aria-label="Carregando coleta"
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
      <Truck
        :size="32"
        aria-hidden="true"
      /><h2>Não foi possível abrir esta coleta.</h2><p role="alert">
        {{ loadError }}
      </p><div class="dialog-actions">
        <RouterLink
          class="button-quiet"
          to="/coletas"
        >Voltar para coletas</RouterLink><button
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
      class="collection-form"
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
      <div class="collection-form-layout">
        <div class="collection-form-main">
          <fieldset
            class="data-card form-card"
            :disabled="submitting || final"
          >
            <legend class="sr-only">
              Dados do agendamento
            </legend>
            <div class="card-heading">
              <span class="section-icon"><CalendarDays
                :size="20"
                aria-hidden="true"
              /></span><div><h2>Dados do agendamento</h2><p>Cliente, MTR, resíduo, data e valores são obrigatórios.</p></div>
            </div>
            <div class="collection-form-grid">
              <ClientePicker
                v-model="data.clienteId"
                class="form-wide"
                :disabled="submitting || final"
                :error="errors.clienteId"
              />
              <div
                v-for="field in fields"
                :key="field.key"
                class="form-field"
              >
                <label :for="field.key">{{ field.label }}</label><input
                  :id="field.key"
                  v-model="data[field.key]"
                  :name="field.key"
                  :type="field.type"
                  :inputmode="field.decimal ? 'decimal' : undefined"
                  :maxlength="field.max"
                  :min="field.type === 'date' ? '1000-01-01' : undefined"
                  :max="field.type === 'date' ? '9999-12-31' : undefined"
                  :placeholder="field.placeholder"
                  required
                  :aria-invalid="!!errors[field.key]"
                  :aria-describedby="`${field.key}-hint`"
                /><p
                  :id="`${field.key}-hint`"
                  :class="errors[field.key] ? 'field-error' : 'field-hint'"
                >
                  {{ errors[field.key] || field.hint }}
                </p>
              </div>
              <ResiduoField
                v-model="data.tipoResiduo"
                class="form-wide"
                required
                :disabled="submitting || final"
                :error="errors.tipoResiduo"
              />
            </div>
          </fieldset>
          <fieldset
            class="data-card form-card"
            :disabled="submitting"
          >
            <legend class="sr-only">
              Observações
            </legend><div class="card-heading">
              <span class="section-icon"><Info
                :size="20"
                aria-hidden="true"
              /></span><div><h2>Observações</h2><p>Informações adicionais para acompanhar a operação.</p></div>
            </div><div class="collection-form-grid">
              <div class="form-field form-wide">
                <label for="observacao">Observação (opcional)</label><textarea
                  id="observacao"
                  v-model="data.observacao"
                  name="observacao"
                  rows="4"
                  maxlength="2000"
                  placeholder="Descreva orientações ou informações relevantes…"
                  :aria-invalid="!!errors.observacao"
                  aria-describedby="observacao-hint"
                /><p
                  id="observacao-hint"
                  :class="errors.observacao ? 'field-error' : 'field-hint'"
                >
                  {{ errors.observacao || `${data.observacao.length}/2000 caracteres` }}
                </p>
              </div>
            </div>
          </fieldset>
        </div>
        <aside
          class="collection-guide data-card"
          aria-label="Etapas da coleta"
        >
          <h2>Rastreabilidade em dia</h2><p>Cada etapa mantém o histórico da destinação.</p>
          <ol class="collection-steps">
            <li :class="{ current: !coleta || coleta.status === 'Agendada' }">
              <span>1</span><div><strong>Agendamento</strong><p>Cliente ativo, MTR e previsão de coleta.</p></div>
            </li><li :class="{ current: coleta?.status === 'Realizada' && !coleta.dataCdf }">
              <span>2</span><div><strong>Realização</strong><p>Confirme a data e o peso destinado.</p></div>
            </li><li :class="{ current: !!coleta?.dataCdf }">
              <span>3</span><div><strong>Certificado CDF</strong><p>Registre a data do certificado recebido.</p></div>
            </li>
          </ol>
          <p class="guide-note">
            <Info
              :size="17"
              aria-hidden="true"
            />{{ final ? 'O registro foi finalizado. Somente a observação pode ser alterada neste formulário.' : 'Realizar e cancelar são ações definitivas, disponíveis na lista de coletas.' }}
          </p>
          <div
            v-if="coleta"
            class="collection-record"
          >
            <h3>
              <FileCheck2
                :size="17"
                aria-hidden="true"
              />Registro da operação
            </h3><dl><div><dt>Realizada em</dt><dd>{{ formatDate(coleta.dataRealizada) }}</dd></div><div><dt>Peso destinado</dt><dd>{{ coleta.pesoKg ? `${formatDecimal(coleta.pesoKg, 3)} kg` : '—' }}</dd></div><div><dt>Data do CDF</dt><dd>{{ formatDate(coleta.dataCdf) }}</dd></div><div><dt>Receita</dt><dd>R$ {{ formatDecimal(coleta.valorReceita) }}</dd></div><div><dt>Despesa</dt><dd>R$ {{ formatDecimal(coleta.valorDespesa) }}</dd></div></dl><RouterLink
              v-if="coleta.status === 'Realizada'"
              class="button-text"
              to="/coletas"
            >{{ coleta.dataCdf ? 'Corrigir CDF na lista' : 'Registrar CDF na lista' }}</RouterLink>
          </div>
        </aside>
      </div>
      <div class="form-bottom-actions">
        <RouterLink
          class="button-quiet"
          to="/coletas"
        >Voltar</RouterLink><button
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
          />{{ submitting ? 'Salvando…' : editing ? 'Salvar alterações' : 'Agendar coleta' }}
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
