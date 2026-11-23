<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Building2, ChevronDown, LoaderCircle, Pencil, Plus, Power, Search, Trash2, UsersRound } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { showSuccess } from '../composables/useFeedback';
import { clientesApi, clientesRouteQuery, formatCnpj, parseClientesQuery, type Cliente, type ClientesQuery, type ClientesResult } from '../services/clientes';

const route = useRoute();
const router = useRouter();
const query = computed(() => parseClientesQuery(route.query));
const filters = reactive({ busca: '', ativo: '' as ClientesQuery['ativo'], limite: 20 });
const result = ref<ClientesResult>();
const loading = ref(true);
const error = ref('');
const action = ref<{ cliente: Cliente; kind: 'situacao' | 'excluir' }>();
const actionLoading = ref(false);
const actionError = ref('');
let controller: AbortController | undefined;
let revision = 0;
const filtered = computed(() => !!query.value.busca || !!query.value.ativo);
const outsidePage = computed(() => !!result.value?.meta.total && !result.value.itens.length);
const rangeStart = computed(() => result.value?.itens.length ? (query.value.pagina - 1) * query.value.limite + 1 : 0);

async function load(): Promise<void> {
  const current = ++revision;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  Object.assign(filters, { busca: query.value.busca, ativo: query.value.ativo, limite: query.value.limite });
  loading.value = true;
  error.value = '';
  try {
    const response = await clientesApi.listar(query.value, signal);
    if (current === revision) result.value = response;
  } catch (failure) {
    if (signal.aborted || current !== revision) return;
    result.value = undefined;
    error.value = failure instanceof Error ? failure.message : 'Não foi possível carregar os clientes.';
  } finally { if (current === revision) loading.value = false; }
}
function navigate(next: ClientesQuery): void {
  const target = { name: 'clientes', query: clientesRouteQuery(next) };
  if (router.resolve(target).fullPath === route.fullPath) void load();
  else void router.push(target);
}
function applyFilters(): void { navigate({ ...filters, busca: filters.busca.trim(), pagina: 1 }); }
function clearFilters(): void { navigate({ busca: '', ativo: '', limite: 20, pagina: 1 }); }
function openAction(cliente: Cliente, kind: 'situacao' | 'excluir'): void { action.value = { cliente, kind }; actionError.value = ''; }
async function confirmAction(): Promise<void> {
  if (!action.value || actionLoading.value) return;
  const { cliente, kind } = action.value;
  actionLoading.value = true;
  actionError.value = '';
  try {
    if (kind === 'excluir') await clientesApi.excluir(cliente.id);
    else await clientesApi.atualizar(cliente.id, { ativo: !cliente.ativo });
    showSuccess(kind === 'excluir' ? `Cliente “${cliente.nome}” excluído.` : `Cliente “${cliente.nome}” ${cliente.ativo ? 'inativado' : 'ativado'}.`);
    action.value = undefined;
    if (kind === 'excluir' && result.value?.itens.length === 1 && query.value.pagina > 1) navigate({ ...query.value, pagina: query.value.pagina - 1 });
    else await load();
  } catch (failure) { actionError.value = failure instanceof Error ? failure.message : 'Não foi possível concluir a ação.'; }
  finally { actionLoading.value = false; }
}
watch(() => route.fullPath, () => void load(), { immediate: true });
onBeforeUnmount(() => { revision++; controller?.abort(); });
</script>

<template>
  <PortalLayout>
    <div class="page-heading">
      <div>
        <p class="eyebrow">
          Sua operação
        </p><h1>Clientes</h1><p class="page-description">
          Uma base organizada para cada nova coleta.
        </p>
      </div>
      <RouterLink
        class="button-primary"
        to="/clientes/novo"
      ><Plus
        :size="18"
        aria-hidden="true"
      />Novo cliente</RouterLink>
    </div>
    <section
      class="data-card"
      aria-labelledby="base-clientes"
    >
      <div class="card-heading">
        <span class="section-icon"><UsersRound
          :size="20"
          aria-hidden="true"
        /></span><div>
          <h2 id="base-clientes">
            Base de clientes
          </h2><p>Consulte, atualize e acompanhe a situação dos seus clientes.</p>
        </div><span
          v-if="result"
          class="count-badge numeric"
        >{{ result.meta.total }} {{ result.meta.total === 1 ? 'cliente' : 'clientes' }}</span>
      </div>
      <form
        class="list-filters"
        role="search"
        aria-label="Filtrar clientes"
        @submit.prevent="applyFilters"
      >
        <div class="form-field filter-search">
          <label for="busca">Buscar cliente</label><div class="search-input">
            <Search
              :size="18"
              aria-hidden="true"
            /><input
              id="busca"
              v-model="filters.busca"
              type="search"
              name="busca"
              maxlength="150"
              placeholder="Nome, CNPJ ou cidade"
            />
          </div>
        </div>
        <div class="form-field">
          <label for="situacao">Situação</label><div class="select-wrap">
            <select
              id="situacao"
              v-model="filters.ativo"
              name="situacao"
            >
              <option value="">
                Todos os clientes
              </option>
              <option value="true">
                Ativos
              </option>
              <option value="false">
                Inativos
              </option>
            </select><ChevronDown
              :size="16"
              aria-hidden="true"
            />
          </div>
        </div>
        <button
          type="submit"
          class="button-quiet"
          :disabled="loading"
        >
          Buscar
        </button>
        <button
          v-if="filtered"
          type="button"
          class="button-text"
          @click="clearFilters"
        >
          Limpar filtros
        </button>
      </form>
      <div
        class="list-status"
        role="status"
        aria-live="polite"
      >
        <span v-if="loading"><LoaderCircle
          class="spin"
          :size="15"
          aria-hidden="true"
        />{{ result ? 'Atualizando clientes…' : 'Carregando clientes…' }}</span><span v-else-if="result">{{ filtered ? 'Resultado da busca' : 'Todos os clientes' }} · ordenados por nome</span>
      </div>
      <div
        v-if="error"
        class="empty-state"
      >
        <Building2
          :size="32"
          aria-hidden="true"
        /><h3>Não foi possível carregar a lista.</h3><p role="alert">
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
        v-else-if="loading && !result"
        class="list-skeleton"
        aria-hidden="true"
      >
        <div
          v-for="row in 5"
          :key="row"
        />
      </div>
      <template v-else-if="result">
        <div
          v-if="!result.itens.length"
          class="empty-state"
        >
          <UsersRound
            :size="36"
            aria-hidden="true"
          /><h3>{{ outsidePage ? 'Esta página não tem clientes.' : filtered ? 'Nenhum cliente encontrado.' : 'Sua base de clientes começa aqui.' }}</h3><p>{{ outsidePage ? 'Volte à primeira página para consultar os registros disponíveis.' : filtered ? 'Experimente outro nome, CNPJ ou cidade, ou limpe os filtros.' : 'Cadastre o primeiro cliente para organizar as próximas coletas.' }}</p><button
            v-if="outsidePage"
            type="button"
            class="button-quiet"
            @click="navigate({ ...query, pagina: 1 })"
          >
            Voltar à primeira página
          </button><button
            v-else-if="filtered"
            type="button"
            class="button-quiet"
            @click="clearFilters"
          >
            Limpar filtros
          </button><RouterLink
            v-else
            class="button-primary"
            to="/clientes/novo"
          ><Plus
            :size="18"
            aria-hidden="true"
          />Cadastrar primeiro cliente</RouterLink>
        </div>
        <div
          v-else
          class="table-region"
          role="region"
          aria-label="Lista de clientes, com rolagem horizontal em telas estreitas"
          tabindex="0"
          :aria-busy="loading"
        >
          <table class="clients-table">
            <caption class="sr-only">
              Clientes ordenados por nome, com CNPJ, localização, situação e ações.
            </caption><thead>
              <tr>
                <th scope="col">
                  Cliente
                </th><th scope="col">
                  CNPJ
                </th><th scope="col">
                  Localização
                </th><th scope="col">
                  Situação
                </th><th
                  scope="col"
                  class="actions-heading"
                >
                  Ações
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="cliente in result.itens"
                :key="cliente.id"
              >
                <td>
                  <div class="client-name">
                    <span
                      class="client-avatar"
                      aria-hidden="true"
                    ><Building2 :size="19" /></span><div><RouterLink :to="`/clientes/${cliente.id}/editar`">{{ cliente.nome }}</RouterLink><small v-if="cliente.possuiColetas">Histórico de coletas vinculado</small></div>
                  </div>
                </td><td class="numeric cnpj-cell">
                  {{ formatCnpj(cliente.cnpj) }}
                </td><td>{{ cliente.cidade }}<span class="city-uf"> / {{ cliente.uf }}</span></td><td>
                  <span
                    class="status-badge"
                    :class="cliente.ativo ? 'status-active' : 'status-inactive'"
                  >{{ cliente.ativo ? 'Ativo' : 'Inativo' }}</span>
                </td><td>
                  <div class="row-actions">
                    <RouterLink
                      class="icon-button"
                      :to="`/clientes/${cliente.id}/editar`"
                      :aria-label="`Editar ${cliente.nome}`"
                      title="Editar cliente"
                    ><Pencil
                      :size="17"
                      aria-hidden="true"
                    /></RouterLink><button
                      class="icon-button"
                      type="button"
                      :aria-label="`${cliente.ativo ? 'Inativar' : 'Ativar'} ${cliente.nome}`"
                      :title="cliente.ativo ? 'Inativar cliente' : 'Ativar cliente'"
                      @click="openAction(cliente, 'situacao')"
                    >
                      <Power
                        :size="17"
                        aria-hidden="true"
                      />
                    </button><button
                      class="icon-button destructive-icon"
                      type="button"
                      :disabled="cliente.possuiColetas"
                      :aria-label="`Excluir ${cliente.nome}`"
                      :title="cliente.possuiColetas ? 'Este cliente possui coletas. Use a ação de inativar.' : 'Excluir cliente'"
                      @click="openAction(cliente, 'excluir')"
                    >
                      <Trash2
                        :size="17"
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
          v-if="result.meta.total > 0"
          class="table-footer"
        >
          <span class="numeric">{{ rangeStart }}–{{ rangeStart ? rangeStart + result.itens.length - 1 : 0 }} de {{ result.meta.total }}</span><div class="pagination">
            <label for="por-pagina">Por página</label><div class="select-wrap">
              <select
                id="por-pagina"
                v-model.number="filters.limite"
                :disabled="loading"
                @change="applyFilters"
              >
                <option :value="10">
                  10
                </option><option :value="20">
                  20
                </option><option :value="50">
                  50
                </option>
              </select><ChevronDown
                :size="15"
                aria-hidden="true"
              />
            </div><span class="numeric">Página {{ query.pagina }} de {{ result.meta.totalPaginas }}</span><button
              type="button"
              class="button-quiet"
              :disabled="loading || query.pagina <= 1"
              @click="navigate({ ...query, pagina: query.pagina - 1 })"
            >
              Anterior
            </button><button
              type="button"
              class="button-quiet"
              :disabled="loading || query.pagina >= result.meta.totalPaginas"
              @click="navigate({ ...query, pagina: query.pagina + 1 })"
            >
              Próxima
            </button>
          </div>
        </div>
      </template>
    </section>
    <p class="list-hint">
      Clientes com coletas vinculadas devem ser inativados para preservar o histórico.
    </p>
    <ConfirmDialog
      :open="!!action"
      :title="action?.kind === 'excluir' ? 'Excluir este cliente?' : action?.cliente.ativo ? 'Inativar este cliente?' : 'Ativar este cliente?'"
      :description="action?.kind === 'excluir' ? `O cadastro de “${action.cliente.nome}” será excluído. Esta ação não pode ser desfeita.` : action?.cliente.ativo ? `“${action.cliente.nome}” continuará no histórico, mas não poderá receber novas coletas.` : `“${action?.cliente.nome}” poderá receber novas coletas novamente.`"
      :confirm-label="action?.kind === 'excluir' ? 'Excluir cliente' : action?.cliente.ativo ? 'Inativar cliente' : 'Ativar cliente'"
      :danger="action?.kind === 'excluir'"
      :loading="actionLoading"
      :error="actionError"
      @cancel="action = undefined"
      @confirm="confirmAction"
    />
  </PortalLayout>
</template>
