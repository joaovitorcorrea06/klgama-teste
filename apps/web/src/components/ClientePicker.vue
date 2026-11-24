<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue';
import { Building2, Check, ChevronLeft, ChevronRight, LoaderCircle, Search, X } from '@lucide/vue';
import { clientesApi, formatCnpj, type Cliente, type ClientesResult } from '../services/clientes';

const props = withDefaults(defineProps<{ modelValue: string; activeOnly?: boolean; error?: string; disabled?: boolean }>(), { activeOnly: true, error: '', disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const id = useId();
const dialog = ref<HTMLDialogElement>();
const trigger = ref<HTMLButtonElement>();
const nameInput = ref<HTMLInputElement>();
const cnpjInput = ref<HTMLInputElement>();
const opened = ref(false);
const filters = reactive({ nome: '', cnpj: '', cidade: '' });
const applied = ref({ ...filters });
const pagina = ref(1);
const limite = ref(10);
const result = ref<ClientesResult>();
const selected = ref<Cliente>();
const loading = ref(false);
const failure = ref('');
const selectionLoading = ref(false);
const selectionFailure = ref('');
const cnpjError = ref('');
const filtered = computed(() => Object.values(applied.value).some(Boolean));
const rangeStart = computed(() => result.value?.itens.length ? (pagina.value - 1) * limite.value + 1 : 0);
const totalPages = computed(() => Math.max(1, result.value?.meta.totalPaginas ?? 0));
let controller: AbortController | undefined;
let revision = 0;
let selectionRevision = 0;
let previousOverflow: string | undefined;

async function load(): Promise<void> {
  const current = ++revision;
  controller?.abort(); controller = new AbortController();
  const signal = controller.signal;
  loading.value = true; failure.value = '';
  try {
    const response = await clientesApi.listar({ ...applied.value, busca: '', ativo: props.activeOnly ? 'true' : '', pagina: pagina.value, limite: limite.value }, signal);
    if (current === revision) result.value = response;
  } catch (error) {
    if (current === revision && !signal.aborted) { result.value = undefined; failure.value = error instanceof Error ? error.message : 'Não foi possível buscar clientes.'; }
  } finally { if (current === revision) loading.value = false; }
}
async function loadSelected(value: string): Promise<void> {
  const current = ++selectionRevision;
  selectionFailure.value = ''; selectionLoading.value = false;
  if (!value) { selected.value = undefined; return; }
  if (selected.value?.id === value) return;
  selected.value = undefined; selectionLoading.value = true;
  try { const cliente = await clientesApi.buscar(value); if (current === selectionRevision) selected.value = cliente; }
  catch (error) { if (current === selectionRevision) selectionFailure.value = error instanceof Error ? error.message : 'Não foi possível carregar o cliente selecionado.'; }
  finally { if (current === selectionRevision) selectionLoading.value = false; }
}
async function open(): Promise<void> {
  if (props.disabled || opened.value) return;
  Object.assign(filters, { nome: '', cnpj: '', cidade: '' }); applied.value = { ...filters };
  pagina.value = 1; result.value = undefined; cnpjError.value = '';
  opened.value = true;
  await nextTick();
  if (!opened.value || !dialog.value?.isConnected) return;
  previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  dialog.value?.showModal(); nameInput.value?.focus();
  void load();
}
function close(): void {
  revision++; controller?.abort(); loading.value = false; opened.value = false;
  dialog.value?.close();
  if (previousOverflow !== undefined) { document.body.style.overflow = previousOverflow; previousOverflow = undefined; }
  if (trigger.value?.isConnected) trigger.value.focus();
}
function choose(cliente: Cliente): void {
  if (props.disabled || (props.activeOnly && !cliente.ativo)) return;
  selectionRevision++; selectionLoading.value = false; selectionFailure.value = ''; selected.value = cliente;
  emit('update:modelValue', cliente.id); close();
}
function clear(): void { selectionRevision++; selected.value = undefined; selectionFailure.value = ''; selectionLoading.value = false; emit('update:modelValue', ''); }
function apply(): void {
  cnpjError.value = '';
  const cnpj = filters.cnpj.replace(/[.\s/-]/g, '');
  if (filters.cnpj.trim() && !/^\d{1,14}$/.test(cnpj)) { cnpjError.value = 'Informe de 1 a 14 dígitos do CNPJ.'; void nextTick(() => cnpjInput.value?.focus()); return; }
  applied.value = { nome: filters.nome.trim(), cnpj, cidade: filters.cidade.trim() };
  pagina.value = 1; void load();
}
function clearFilters(): void { Object.assign(filters, { nome: '', cnpj: '', cidade: '' }); apply(); }
function page(value: number): void { if (loading.value || value < 1 || value > totalPages.value) return; pagina.value = value; void load(); }
function changeLimit(event: Event): void {
  const value = Number((event.target as HTMLSelectElement).value);
  if (![10, 20, 50].includes(value)) return;
  limite.value = value; pagina.value = 1; void load();
}
watch(() => props.modelValue, value => void loadSelected(value), { immediate: true });
watch(() => props.activeOnly, () => { if (opened.value) { pagina.value = 1; void load(); } });
watch(() => props.disabled, value => { if (value && opened.value) close(); });
onBeforeUnmount(() => { selectionRevision++; close(); });
</script>

<template>
  <div class="client-picker form-field">
    <label :for="`${id}-trigger`">Cliente{{ activeOnly ? ' (obrigatório)' : '' }}</label>
    <div class="client-selector-field">
      <button
        :id="`${id}-trigger`"
        ref="trigger"
        type="button"
        class="client-selector"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="`${id}-hint${error ? ` ${id}-error` : ''}`"
        aria-haspopup="dialog"
        :aria-controls="`${id}-dialog`"
        :aria-expanded="opened"
        :aria-label="selected ? `Alterar cliente: ${selected.nome}` : 'Selecionar cliente'"
        :title="selected ? `${selected.nome} · ${formatCnpj(selected.cnpj)} · ${selected.cidade}/${selected.uf}` : 'Buscar cliente por nome, CNPJ ou cidade'"
        @click="open"
      >
        <Building2
          :size="20"
          aria-hidden="true"
        />
        <span
          v-if="selected"
          class="client-selector-value"
        ><strong>{{ selected.nome }}</strong><small>{{ formatCnpj(selected.cnpj) }} · {{ selected.cidade }}/{{ selected.uf }}{{ selected.ativo ? '' : ' · Inativo' }}</small></span>
        <span
          v-else
          class="client-selector-placeholder"
        >{{ selectionLoading ? 'Carregando cliente…' : modelValue ? 'Consultar cliente selecionado' : activeOnly ? 'Selecione um cliente' : 'Todos os clientes' }}</span>
        <Search
          :size="18"
          aria-hidden="true"
        />
      </button>
      <button
        v-if="modelValue && !disabled"
        class="button-quiet client-selector-clear"
        type="button"
        aria-label="Limpar cliente selecionado"
        @click="clear"
      >
        <X
          :size="18"
          aria-hidden="true"
        />
      </button>
    </div>
    <p
      :id="`${id}-hint`"
      class="field-hint"
    >
      {{ activeOnly ? 'Escolha na lista de clientes ativos.' : 'Busque por nome, CNPJ ou cidade para filtrar as coletas.' }}
    </p>
    <p
      v-if="error"
      :id="`${id}-error`"
      class="field-error"
    >
      {{ error }}
    </p>
    <p
      v-if="selectionFailure"
      class="picker-error"
      role="alert"
    >
      {{ selectionFailure }} <button
        type="button"
        class="button-text"
        @click="loadSelected(modelValue)"
      >
        Recarregar cliente
      </button>
    </p>
    <Teleport to="body">
      <dialog
        :id="`${id}-dialog`"
        ref="dialog"
        class="client-catalog"
        :aria-labelledby="`${id}-title`"
        :aria-describedby="`${id}-description`"
        @cancel.prevent="close"
      >
        <div class="client-catalog-layout">
          <header class="client-catalog-header">
            <span class="client-catalog-icon"><Building2
              :size="23"
              aria-hidden="true"
            /></span>
            <div>
              <h2 :id="`${id}-title`">
                Selecionar cliente
              </h2><p :id="`${id}-description`">
                {{ activeOnly ? 'Clientes ativos disponíveis para o agendamento.' : 'Consulte todos os clientes, incluindo os inativos com histórico.' }}
              </p>
            </div>
            <button
              type="button"
              class="button-quiet client-catalog-close"
              aria-label="Fechar seleção de cliente"
              @click="close"
            >
              <X
                :size="20"
                aria-hidden="true"
              />
            </button>
          </header>
          <div class="client-catalog-content">
            <form
              class="client-catalog-filters"
              aria-label="Filtrar clientes para seleção"
              novalidate
              @submit.prevent="apply"
            >
              <div class="form-field">
                <label :for="`${id}-nome`">Nome do cliente</label><input
                  :id="`${id}-nome`"
                  ref="nameInput"
                  v-model="filters.nome"
                  type="search"
                  maxlength="160"
                  placeholder="Nome ou parte do nome"
                  autocomplete="off"
                />
              </div>
              <div class="form-field">
                <label :for="`${id}-cnpj`">CNPJ</label><input
                  :id="`${id}-cnpj`"
                  ref="cnpjInput"
                  v-model="filters.cnpj"
                  type="search"
                  inputmode="numeric"
                  maxlength="18"
                  placeholder="Completo ou parcial"
                  autocomplete="off"
                  :aria-invalid="!!cnpjError"
                  :aria-describedby="cnpjError ? `${id}-cnpj-error` : undefined"
                  @input="cnpjError = ''"
                /><p
                  v-if="cnpjError"
                  :id="`${id}-cnpj-error`"
                  class="field-error"
                  role="alert"
                >
                  {{ cnpjError }}
                </p>
              </div>
              <div class="form-field">
                <label :for="`${id}-cidade`">Cidade</label><input
                  :id="`${id}-cidade`"
                  v-model="filters.cidade"
                  type="search"
                  maxlength="120"
                  placeholder="Cidade ou parte do nome"
                  autocomplete="off"
                />
              </div>
              <div class="client-catalog-filter-actions">
                <button
                  type="button"
                  class="button-text"
                  @click="clearFilters"
                >
                  Limpar filtros
                </button><button
                  type="submit"
                  class="button-primary"
                  :disabled="loading"
                >
                  <LoaderCircle
                    v-if="loading"
                    :size="17"
                    class="spin"
                    aria-hidden="true"
                  /><Search
                    v-else
                    :size="17"
                    aria-hidden="true"
                  />{{ loading ? 'Buscando…' : 'Buscar clientes' }}
                </button>
              </div>
            </form>
            <div
              v-if="loading"
              class="client-catalog-state"
              role="status"
            >
              <LoaderCircle
                :size="26"
                class="spin"
                aria-hidden="true"
              /><p>Buscando clientes…</p>
            </div>
            <div
              v-else-if="failure"
              class="client-catalog-state"
            >
              <h3>Não foi possível consultar os clientes.</h3><p role="alert">
                {{ failure }}
              </p><button
                type="button"
                class="button-quiet"
                @click="load"
              >
                Tentar novamente
              </button>
            </div>
            <template v-else-if="result">
              <p
                class="client-catalog-count"
                role="status"
              >
                {{ result.meta.total }} {{ result.meta.total === 1 ? 'cliente encontrado' : 'clientes encontrados' }}{{ filtered ? ' com os filtros aplicados' : '' }} · Ordenados por nome
              </p>
              <div
                v-if="!result.itens.length"
                class="client-catalog-state"
              >
                <Building2
                  :size="28"
                  aria-hidden="true"
                /><h3>{{ result.meta.total ? 'Esta página não tem clientes.' : filtered ? 'Nenhum cliente encontrado.' : activeOnly ? 'Nenhum cliente ativo disponível.' : 'Nenhum cliente cadastrado.' }}</h3><p>{{ filtered ? 'Ajuste os filtros ou limpe a busca para consultar a lista.' : 'Cadastre um cliente na gestão de clientes para continuar.' }}</p><button
                  v-if="result.meta.total"
                  type="button"
                  class="button-quiet"
                  @click="page(1)"
                >
                  Voltar à primeira página
                </button><button
                  v-else-if="filtered"
                  type="button"
                  class="button-quiet"
                  @click="clearFilters"
                >
                  Limpar busca
                </button>
              </div>
              <table
                v-else
                class="client-catalog-table"
              >
                <caption class="sr-only">
                  Clientes disponíveis para seleção, ordenados por nome
                </caption><thead>
                  <tr>
                    <th scope="col">
                      Cliente / CNPJ
                    </th><th scope="col">
                      Localização
                    </th><th scope="col">
                      Situação
                    </th><th scope="col">
                      <span class="sr-only">Selecionar</span>
                    </th>
                  </tr>
                </thead><tbody>
                  <tr
                    v-for="cliente in result.itens"
                    :key="cliente.id"
                    :class="{ 'client-catalog-selected': cliente.id === modelValue }"
                  >
                    <td><strong>{{ cliente.nome }}</strong><span class="numeric">{{ formatCnpj(cliente.cnpj) }}</span></td><td>{{ cliente.cidade }} / {{ cliente.uf }}</td><td>
                      <span
                        class="status-badge"
                        :class="cliente.ativo ? 'status-active' : 'status-inactive'"
                      >{{ cliente.ativo ? 'Ativo' : 'Inativo' }}</span>
                    </td><td>
                      <button
                        type="button"
                        class="button-quiet"
                        :aria-label="`Selecionar ${cliente.nome}`"
                        @click="choose(cliente)"
                      >
                        <Check
                          v-if="cliente.id === modelValue"
                          :size="15"
                          aria-hidden="true"
                        />{{ cliente.id === modelValue ? 'Selecionado' : 'Selecionar' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
          <footer class="client-catalog-footer">
            <div class="client-catalog-page-size">
              <label :for="`${id}-limite`">Por página</label><select
                :id="`${id}-limite`"
                :value="limite"
                :disabled="loading"
                @change="changeLimit"
              >
                <option :value="10">
                  10
                </option><option :value="20">
                  20
                </option><option :value="50">
                  50
                </option>
              </select>
            </div>
            <nav
              class="client-catalog-pagination"
              aria-label="Paginação da seleção de clientes"
            >
              <button
                type="button"
                class="button-quiet"
                aria-label="Página anterior de clientes"
                :disabled="loading || !result || pagina <= 1"
                @click="page(pagina - 1)"
              >
                <ChevronLeft
                  :size="18"
                  aria-hidden="true"
                />
              </button><span>Página {{ pagina }} de {{ totalPages }}<small v-if="result && !loading">{{ rangeStart }}–{{ rangeStart ? rangeStart + result.itens.length - 1 : 0 }} de {{ result.meta.total }}</small></span><button
                type="button"
                class="button-quiet"
                aria-label="Próxima página de clientes"
                :disabled="loading || !result || pagina >= totalPages"
                @click="page(pagina + 1)"
              >
                <ChevronRight
                  :size="18"
                  aria-hidden="true"
                />
              </button>
            </nav>
            <button
              type="button"
              class="button-quiet client-catalog-cancel"
              @click="close"
            >
              Cancelar
            </button>
          </footer>
        </div>
      </dialog>
    </Teleport>
  </div>
</template>
