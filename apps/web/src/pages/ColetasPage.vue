<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Check, ChevronDown, FileCheck2, LoaderCircle, Pencil, Plus, Search, Trash2, Truck, X } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ClientePicker from '../components/ClientePicker.vue';
import ResiduoField from '../components/ResiduoField.vue';
import { showSuccess } from '../composables/useFeedback';
import { ApiError } from '../services/api';
import { coletasApi, coletasRouteQuery, decimalInput, formatDate, formatDecimal, parseColetasQuery, statuses, validDate, type Coleta, type ColetasQuery, type ColetasResult } from '../services/coletas';

const route = useRoute();
const router = useRouter();
const query = computed(() => parseColetasQuery(route.query));
const filters = reactive(parseColetasQuery({}));
const result = ref<ColetasResult>();
const loading = ref(true);
const error = ref('');
const filterError = ref('');
const action = ref<{ coleta: Coleta; kind: 'realizar' | 'cancelar' | 'cdf' | 'excluir' }>();
const actionLoading = ref(false);
const actionError = ref('');
const actionFields = reactive({ pesoKg: '', dataRealizada: '', dataCdf: '' });
const actionForm = ref<HTMLFormElement>();
let controller: AbortController | undefined;
let revision = 0;
const filtered = computed(() => Object.entries(query.value).some(([key, value]) => !['pagina', 'limite'].includes(key) && !!value));
const rangeStart = computed(() => result.value?.itens.length ? (query.value.pagina - 1) * query.value.limite + 1 : 0);
const titles = { realizar: 'Realizar coleta', cancelar: 'Cancelar coleta', cdf: 'Registrar CDF', excluir: 'Excluir coleta' };
const description = computed(() => {
  if (!action.value) return '';
  const { coleta, kind } = action.value;
  const details = `${coleta.numeroMtr} · ${coleta.cliente.nome}.`;
  return `${details} ${kind === 'realizar' ? 'Informe o peso destinado e a data de realização. Esta ação finaliza a coleta.' : kind === 'cancelar' ? 'O cancelamento é definitivo e preserva o registro no histórico.' : kind === 'excluir' ? 'O agendamento será removido permanentemente. Esta ação não pode ser desfeita.' : 'A data do certificado deve ser igual ou posterior à realização.'}`;
});
async function load(): Promise<void> {
  const current = ++revision;
  controller?.abort(); controller = new AbortController();
  const signal = controller.signal;
  Object.assign(filters, query.value);
  loading.value = true; error.value = ''; filterError.value = '';
  try { const response = await coletasApi.listar(query.value, signal); if (current === revision) result.value = response; }
  catch (failure) { if (current === revision && !signal.aborted) { result.value = undefined; error.value = failure instanceof Error ? failure.message : 'Não foi possível carregar as coletas.'; } }
  finally { if (current === revision) loading.value = false; }
}
function navigate(next: ColetasQuery): void {
  const target = { name: 'coletas', query: coletasRouteQuery(next) };
  if (router.resolve(target).fullPath === route.fullPath) void load(); else void router.push(target);
}
function applyFilters(): void {
  filterError.value = '';
  if (filters.inicio && !validDate(filters.inicio) || filters.fim && !validDate(filters.fim)) { filterError.value = 'Informe datas válidas.'; return; }
  if (filters.inicio && filters.fim && filters.inicio > filters.fim) { filterError.value = 'A data inicial deve ser anterior ou igual à final.'; return; }
  if (filters.tipoResiduo.trim().length === 1) { filterError.value = 'Informe pelo menos 2 caracteres no tipo de resíduo.'; return; }
  navigate({ ...filters, tipoResiduo: filters.tipoResiduo.trim().replace(/\s+/g, ' '), pagina: 1 });
}
function openAction(coleta: Coleta, kind: NonNullable<typeof action.value>['kind']): void {
  actionError.value = '';
  Object.assign(actionFields, { pesoKg: '', dataRealizada: '', dataCdf: coleta.dataCdf ?? '' });
  action.value = { coleta, kind };
}
async function confirmAction(): Promise<void> {
  if (!action.value || actionLoading.value) return;
  const { coleta, kind } = action.value;
  actionError.value = '';
  const weight = decimalInput(actionFields.pesoKg, 3, 11, true);
  if (kind === 'realizar' && (!weight || !validDate(actionFields.dataRealizada))) actionError.value = 'Informe peso maior que zero (até 3 casas decimais) e uma data válida.';
  if (kind === 'cdf' && (!validDate(actionFields.dataCdf) || actionFields.dataCdf < coleta.dataRealizada!)) actionError.value = `Informe uma data válida a partir de ${formatDate(coleta.dataRealizada)}.`;
  if (actionError.value) { await nextTick(); actionForm.value?.querySelector<HTMLElement>('input')?.focus(); return; }
  actionLoading.value = true;
  try {
    if (kind === 'realizar') await coletasApi.realizar(coleta.id, { pesoKg: weight!, dataRealizada: actionFields.dataRealizada });
    else if (kind === 'cdf') await coletasApi.cdf(coleta.id, actionFields.dataCdf);
    else if (kind === 'cancelar') await coletasApi.cancelar(coleta.id);
    else await coletasApi.excluir(coleta.id);
    showSuccess(`${coleta.numeroMtr}: ${kind === 'realizar' ? 'coleta realizada' : kind === 'cdf' ? 'CDF registrado' : kind === 'cancelar' ? 'coleta cancelada' : 'agendamento excluído'} com sucesso.`);
    action.value = undefined;
    if (kind === 'excluir' && result.value?.itens.length === 1 && query.value.pagina > 1) navigate({ ...query.value, pagina: query.value.pagina - 1 });
    else await load();
  } catch (failure) {
    actionError.value = failure instanceof Error ? failure.message : 'Não foi possível concluir a ação.';
    if (failure instanceof ApiError && [404, 409].includes(failure.status)) await load();
  } finally { actionLoading.value = false; }
}
watch(() => route.fullPath, () => void load(), { immediate: true });
onBeforeUnmount(() => { revision++; controller?.abort(); });
</script>

<template>
  <PortalLayout>
    <div class="page-heading">
      <div>
        <p class="eyebrow">
          Gestão e rastreabilidade
        </p><h1>Coletas</h1><p class="page-description">
          Do agendamento ao certificado, acompanhe cada etapa da destinação.
        </p>
      </div>
      <RouterLink
        class="button-primary"
        to="/coletas/nova"
      ><Plus
        :size="18"
        aria-hidden="true"
      />Nova coleta</RouterLink>
    </div>
    <section
      class="data-card"
      aria-labelledby="coletas-title"
    >
      <div class="card-heading">
        <span class="section-icon"><Truck
          :size="20"
          aria-hidden="true"
        /></span><div>
          <h2 id="coletas-title">
            Controle de coletas
          </h2><p>Consulte os documentos e mantenha a operação em dia.</p>
        </div><span
          v-if="result && !loading"
          class="count-badge numeric"
        >{{ result.meta.total }} coleta(s)</span>
      </div>
      <details
        class="collection-filter-panel"
        :open="filtered"
      >
        <summary>
          <Search
            :size="17"
            aria-hidden="true"
          />Filtros de consulta <span
            v-if="filtered"
            class="filter-active"
          >Aplicados</span><ChevronDown
            :size="16"
            aria-hidden="true"
          />
        </summary>
        <form
          class="coletas-filters"
          role="search"
          aria-label="Filtrar coletas"
          @submit.prevent="applyFilters"
        >
          <ClientePicker
            v-model="filters.clienteId"
            :active-only="false"
          />
          <div class="collection-filter-fields">
            <div class="form-field">
              <label for="status">Situação</label><div class="select-wrap">
                <select
                  id="status"
                  v-model="filters.status"
                >
                  <option value="">
                    Todas as situações
                  </option><option
                    v-for="status in statuses"
                    :key="status"
                    :value="status"
                  >
                    {{ status }}
                  </option>
                </select><ChevronDown
                  :size="16"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div class="form-field">
              <label for="cdf-filter">Certificado CDF</label><div class="select-wrap">
                <select
                  id="cdf-filter"
                  v-model="filters.semCdf"
                >
                  <option value="">
                    Todos os documentos
                  </option><option value="true">
                    Sem CDF
                  </option><option value="false">
                    Com CDF
                  </option>
                </select><ChevronDown
                  :size="16"
                  aria-hidden="true"
                />
              </div>
            </div>
            <ResiduoField v-model="filters.tipoResiduo" />
            <div class="date-range">
              <div class="form-field">
                <label for="inicio">Agendada a partir de</label><input
                  id="inicio"
                  v-model="filters.inicio"
                  type="date"
                  min="1000-01-01"
                  max="9999-12-31"
                />
              </div><div class="form-field">
                <label for="fim">Agendada até</label><input
                  id="fim"
                  v-model="filters.fim"
                  type="date"
                  min="1000-01-01"
                  max="9999-12-31"
                />
              </div>
            </div>
          </div>
          <p
            v-if="filterError"
            class="field-error form-wide"
            role="alert"
          >
            {{ filterError }}
          </p>
          <div class="filter-actions">
            <button
              class="button-text"
              type="button"
              @click="navigate(parseColetasQuery({}))"
            >
              Limpar filtros
            </button><button
              class="button-primary"
              type="submit"
            >
              <Search
                :size="17"
                aria-hidden="true"
              />Aplicar filtros
            </button>
          </div>
        </form>
      </details>
      <div
        class="list-status"
        role="status"
      >
        <span v-if="loading"><LoaderCircle
          :size="15"
          class="spin"
          aria-hidden="true"
        />Carregando coletas…</span><span v-else>{{ filtered ? 'Consulta com filtros aplicados.' : 'Exibindo todas as coletas.' }} O período considera a data agendada.</span>
      </div>
      <div
        v-if="loading"
        class="list-skeleton"
        aria-hidden="true"
      >
        <div
          v-for="row in 4"
          :key="row"
        />
      </div>
      <div
        v-else-if="error"
        class="empty-state"
      >
        <Truck
          :size="32"
          aria-hidden="true"
        /><h2>Não foi possível consultar as coletas.</h2><p role="alert">
          {{ error }}
        </p><button
          class="button-quiet"
          type="button"
          @click="load"
        >
          Tentar novamente
        </button>
      </div>
      <div
        v-else-if="!result?.itens.length"
        class="empty-state"
      >
        <Truck
          :size="32"
          aria-hidden="true"
        /><h2>{{ result?.meta.total ? 'Esta página está vazia.' : filtered ? 'Nenhuma coleta encontrada.' : 'Sua próxima coleta começa aqui.' }}</h2><p>{{ result?.meta.total ? 'Os registros podem ter sido alterados. Volte para a primeira página.' : filtered ? 'Ajuste os filtros para encontrar os registros desejados.' : 'Cadastre uma coleta para acompanhar o MTR, os valores e o certificado de destinação.' }}</p><button
          v-if="result?.meta.total"
          class="button-quiet"
          type="button"
          @click="navigate({ ...query, pagina: 1 })"
        >
          Voltar à primeira página
        </button><button
          v-else-if="filtered"
          class="button-quiet"
          type="button"
          @click="navigate(parseColetasQuery({}))"
        >
          Limpar filtros
        </button><RouterLink
          v-else
          class="button-primary"
          to="/coletas/nova"
        >Cadastrar primeira coleta</RouterLink>
      </div>
      <div
        v-else
        class="table-region"
        role="region"
        aria-label="Tabela de coletas, role horizontalmente para ver todas as colunas"
        tabindex="0"
      >
        <table class="clients-table collections-table">
          <caption class="sr-only">
            Coletas encontradas na consulta
          </caption><thead>
            <tr>
              <th scope="col">
                MTR / cliente
              </th><th scope="col">
                Agendamento / resíduo
              </th><th scope="col">
                Situação
              </th><th scope="col">
                CDF
              </th><th
                scope="col"
                class="actions-heading"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="coleta in result.itens"
              :key="coleta.id"
            >
              <td>
                <RouterLink
                  class="collection-mtr"
                  :to="`/coletas/${coleta.id}/editar`"
                >{{ coleta.numeroMtr }}</RouterLink><span class="table-secondary">{{ coleta.cliente.nome }}{{ coleta.cliente.ativo ? '' : ' · Inativo' }}</span>
              </td>
              <td><span class="numeric">{{ formatDate(coleta.dataAgendada) }}</span><span class="table-secondary">{{ coleta.tipoResiduo }}</span></td>
              <td>
                <span
                  class="status-badge"
                  :class="coleta.status === 'Realizada' ? 'status-active' : coleta.status === 'Agendada' ? 'status-scheduled' : 'status-inactive'"
                >{{ coleta.status }}</span><span
                  v-if="coleta.pesoKg"
                  class="table-secondary numeric"
                >{{ formatDecimal(coleta.pesoKg, 3) }} kg</span>
              </td>
              <td>
                <span
                  v-if="coleta.dataCdf"
                  class="cdf-received"
                ><FileCheck2
                  :size="16"
                  aria-hidden="true"
                />{{ formatDate(coleta.dataCdf) }}</span><span
                  v-else-if="coleta.status === 'Realizada'"
                  class="cdf-pending"
                >Pendente</span><span
                  v-else
                  class="table-secondary"
                >{{ coleta.status === 'Cancelada' ? 'Não se aplica' : 'Aguardando realização' }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <RouterLink
                    class="icon-button"
                    :to="`/coletas/${coleta.id}/editar`"
                    :aria-label="`Ver ou editar ${coleta.numeroMtr}`"
                    title="Ver ou editar"
                  ><Pencil
                    :size="18"
                    aria-hidden="true"
                  /></RouterLink>
                  <button
                    v-if="coleta.status === 'Agendada'"
                    class="icon-button"
                    type="button"
                    :aria-label="`Realizar ${coleta.numeroMtr}`"
                    title="Realizar coleta"
                    @click="openAction(coleta, 'realizar')"
                  >
                    <Check
                      :size="19"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    v-if="coleta.status === 'Agendada'"
                    class="icon-button destructive-icon"
                    type="button"
                    :aria-label="`Cancelar ${coleta.numeroMtr}`"
                    title="Cancelar coleta"
                    @click="openAction(coleta, 'cancelar')"
                  >
                    <X
                      :size="18"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    v-if="coleta.status === 'Agendada'"
                    class="icon-button destructive-icon"
                    type="button"
                    :aria-label="`Excluir ${coleta.numeroMtr}`"
                    title="Excluir agendamento"
                    @click="openAction(coleta, 'excluir')"
                  >
                    <Trash2
                      :size="18"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    v-if="coleta.status === 'Realizada'"
                    class="icon-button"
                    type="button"
                    :aria-label="`${coleta.dataCdf ? 'Corrigir' : 'Registrar'} CDF de ${coleta.numeroMtr}`"
                    :title="coleta.dataCdf ? 'Corrigir CDF' : 'Registrar CDF'"
                    @click="openAction(coleta, 'cdf')"
                  >
                    <FileCheck2
                      :size="18"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="!loading && result?.meta.total && result.itens.length"
        class="table-footer"
      >
        <span class="numeric">{{ rangeStart }}–{{ rangeStart + result.itens.length - 1 }} de {{ result.meta.total }} coletas</span>
        <nav
          class="pagination"
          aria-label="Paginação de coletas"
        >
          <label for="limite">Por página</label><div class="select-wrap">
            <select
              id="limite"
              :value="query.limite"
              @change="navigate({ ...query, pagina: 1, limite: Number(($event.target as HTMLSelectElement).value) })"
            >
              <option :value="10">
                10
              </option><option :value="20">
                20
              </option><option :value="50">
                50
              </option>
            </select><ChevronDown
              :size="14"
              aria-hidden="true"
            />
          </div><button
            class="button-quiet"
            type="button"
            :disabled="query.pagina <= 1"
            @click="navigate({ ...query, pagina: query.pagina - 1 })"
          >
            Anterior
          </button><span class="numeric">{{ query.pagina }} / {{ result.meta.totalPaginas }}</span><button
            class="button-quiet"
            type="button"
            :disabled="query.pagina >= result.meta.totalPaginas"
            @click="navigate({ ...query, pagina: query.pagina + 1 })"
          >
            Próxima
          </button>
        </nav>
      </div>
    </section>
    <p class="list-hint">
      Realizadas e canceladas permanecem no histórico. “Sem CDF” inclui agendadas; para consultar pendências, combine com a situação “Realizada”.
    </p>
    <ConfirmDialog
      :open="!!action"
      :title="action ? titles[action.kind] : ''"
      :description="description"
      :confirm-label="action ? titles[action.kind] : ''"
      :danger="action?.kind === 'cancelar' || action?.kind === 'excluir'"
      :loading="actionLoading"
      :error="actionError"
      @cancel="action = undefined"
      @confirm="confirmAction"
    >
      <form
        v-if="action?.kind === 'realizar' || action?.kind === 'cdf'"
        ref="actionForm"
        class="action-fields"
        novalidate
        @submit.prevent="confirmAction"
      >
        <fieldset :disabled="actionLoading">
          <legend class="sr-only">
            {{ titles[action.kind] }}
          </legend>
          <template v-if="action.kind === 'realizar'">
            <div class="form-field">
              <label for="peso">Peso destinado (kg)</label><input
                id="peso"
                v-model="actionFields.pesoKg"
                inputmode="decimal"
                placeholder="Ex.: 1250,500"
                maxlength="16"
                required
              /><p class="field-hint">
                Maior que zero, com até 3 casas decimais.
              </p>
            </div><div class="form-field">
              <label for="realizada">Data de realização</label><input
                id="realizada"
                v-model="actionFields.dataRealizada"
                type="date"
                min="1000-01-01"
                max="9999-12-31"
                required
              />
            </div>
          </template>
          <div
            v-else
            class="form-field"
          >
            <label for="data-cdf">Data do CDF</label><input
              id="data-cdf"
              v-model="actionFields.dataCdf"
              type="date"
              :min="action.coleta.dataRealizada!"
              max="9999-12-31"
              required
            /><p class="field-hint">
              Realizada em {{ formatDate(action.coleta.dataRealizada) }}.
            </p>
          </div>
          <button
            class="sr-only"
            tabindex="-1"
            type="submit"
          >
            Confirmar
          </button>
        </fieldset>
      </form>
    </ConfirmDialog>
  </PortalLayout>
</template>
