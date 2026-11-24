<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, FileCheck2, Files, Info, LoaderCircle, Plus, TrendingUp } from '@lucide/vue';
import PortalLayout from '../components/PortalLayout.vue';
import DashboardChart from '../components/DashboardChart.vue';
import { formatDate } from '../services/coletas';
import { defaultPeriodo, formatFixed, formatMonth, monthIndex, painelApi, parsePainelQuery, validMonth, type Painel, type PainelQuery } from '../services/painel';

const route = useRoute();
const router = useRouter();
const query = computed(() => parsePainelQuery(route.query));
const filters = reactive({ ...query.value });
const result = ref<Painel>();
const loading = ref(true);
const error = ref('');
const filterError = ref('');
const metric = computed(() => ['receita', 'despesa'].includes(String(route.query.metrica)) ? String(route.query.metrica) as 'receita' | 'despesa' : 'toneladas');
const metrics = [{ key: 'toneladas', label: 'Toneladas' }, { key: 'receita', label: 'Receita' }, { key: 'despesa', label: 'Despesa' }] as const;
const metricLabel = computed(() => metrics.find(item => item.key === metric.value)!.label);
const periodLabel = computed(() => result.value ? `${formatMonth(result.value.periodo.inicio, true)} a ${formatMonth(result.value.periodo.fim, true)}` : '');
const months = computed(() => result.value?.financeiroMensal.map(row => row.mes) ?? []);
const finance = computed(() => [{ label: 'Receita', color: '#F26D27', values: result.value?.financeiroMensal.map(row => row.receita) ?? [] }, { label: 'Despesa', color: '#262B3C', values: result.value?.financeiroMensal.map(row => row.despesa) ?? [] }]);
const traceability = computed(() => [{ label: 'Com CDF', color: '#2E7D32', values: result.value?.rastreabilidadeMensal.map(row => row.comCdf) ?? [] }, { label: 'Sem CDF', color: '#FFCCBC', values: result.value?.rastreabilidadeMensal.map(row => row.semCdf) ?? [] }]);
const evolution = computed(() => [{ label: metricLabel.value, color: metric.value === 'despesa' ? '#262B3C' : '#F26D27', values: result.value?.evolucaoMensal.map(row => row[metric.value]) ?? [] }]);
let controller: AbortController | undefined;
let revision = 0;
async function load(): Promise<void> {
  const current = ++revision;
  controller?.abort(); controller = new AbortController();
  const signal = controller.signal;
  Object.assign(filters, query.value);
  loading.value = true; error.value = ''; filterError.value = '';
  try { const response = await painelApi.consultar(query.value, signal); if (current === revision) result.value = response; }
  catch (failure) { if (current === revision && !signal.aborted) { result.value = undefined; error.value = failure instanceof Error ? failure.message : 'Não foi possível carregar os indicadores.'; } }
  finally { if (current === revision) loading.value = false; }
}
function navigate(next: PainelQuery): void {
  const target = { name: 'painel', query: { ...next, ...(metric.value !== 'toneladas' ? { metrica: metric.value } : {}) } };
  if (router.resolve(target).fullPath === route.fullPath) void load(); else void router.push(target);
}
function apply(): void {
  filterError.value = '';
  if (!validMonth(filters.inicio) || !validMonth(filters.fim)) { filterError.value = 'Informe os meses inicial e final.'; void nextTick(() => document.getElementById(!validMonth(filters.inicio) ? 'mes-inicio' : 'mes-fim')?.focus()); return; }
  const count = monthIndex(filters.fim) - monthIndex(filters.inicio) + 1;
  if (count < 1 || count > 60) { filterError.value = 'Selecione de 1 a 60 meses, com início anterior ou igual ao fim.'; void nextTick(() => document.getElementById('mes-inicio')?.focus()); return; }
  navigate({ ...filters });
}
function changeMetric(value: string): void { void router.push({ name: 'painel', query: { ...route.query, metrica: value !== 'toneladas' ? value : undefined } }); }
watch(() => `${query.value.inicio}/${query.value.fim}`, () => void load(), { immediate: true });
onBeforeUnmount(() => { revision++; controller?.abort(); });
</script>

<template>
  <PortalLayout>
    <div class="page-heading dashboard-heading">
      <div>
        <p class="eyebrow">
          Visão da operação
        </p><h1>Painel de indicadores</h1><p class="page-description">
          Documentos, resultados e destinação em uma visão conectada.
        </p>
      </div><RouterLink
        class="button-primary"
        to="/coletas/nova"
      ><Plus
        :size="18"
        aria-hidden="true"
      />Nova coleta</RouterLink>
    </div>
    <form
      class="period-filter data-card"
      aria-label="Período dos indicadores"
      @submit.prevent="apply"
    >
      <div class="period-label">
        <CalendarDays
          :size="20"
          aria-hidden="true"
        /><div><strong>Período de análise</strong><span>Meses inicial e final inclusivos</span></div>
      </div>
      <div class="form-field">
        <label for="mes-inicio">De</label><input
          id="mes-inicio"
          v-model="filters.inicio"
          type="month"
          name="inicio"
          min="1000-01"
          max="9999-12"
          required
          :aria-invalid="!!filterError"
          aria-describedby="period-error"
        />
      </div>
      <div class="form-field">
        <label for="mes-fim">Até</label><input
          id="mes-fim"
          v-model="filters.fim"
          type="month"
          name="fim"
          min="1000-01"
          max="9999-12"
          required
          :aria-invalid="!!filterError"
          aria-describedby="period-error"
        />
      </div>
      <button
        class="button-quiet"
        type="submit"
        :disabled="loading"
      >
        <LoaderCircle
          v-if="loading"
          :size="17"
          class="spin"
          aria-hidden="true"
        />{{ loading ? 'Consultando…' : 'Aplicar período' }}
      </button><button
        class="button-text"
        type="button"
        :disabled="loading"
        @click="navigate(defaultPeriodo())"
      >
        Últimos 12 meses
      </button>
      <p
        v-if="filterError"
        id="period-error"
        class="field-error"
        role="alert"
      >
        {{ filterError }}
      </p>
    </form>
    <div
      v-if="loading"
      class="dashboard-loading"
      role="status"
      aria-label="Carregando os indicadores"
    >
      <div class="kpi-grid">
        <div
          v-for="item in 4"
          :key="item"
          class="data-card list-skeleton"
        >
          <div /><div />
        </div>
      </div><div class="data-card list-skeleton">
        <div
          v-for="item in 4"
          :key="item"
        />
      </div>
    </div>
    <section
      v-else-if="error"
      class="data-card empty-state"
    >
      <CircleAlert
        :size="32"
        aria-hidden="true"
      /><h2>Não foi possível consultar o painel.</h2><p role="alert">
        {{ error }}
      </p><button
        class="button-primary"
        type="button"
        @click="load"
      >
        Tentar novamente
      </button>
    </section>
    <template v-else-if="result">
      <p
        class="dashboard-context"
        role="status"
      >
        {{ periodLabel }} · {{ result.periodo.meses }} {{ result.periodo.meses === 1 ? 'mês' : 'meses' }} · Coletas canceladas excluídas dos indicadores.
      </p>
      <div class="kpi-grid">
        <section class="data-card kpi-card">
          <div class="kpi-label">
            <span>MTR emitidos</span><Files
              :size="20"
              aria-hidden="true"
            />
          </div><strong class="kpi-value numeric">{{ formatFixed(String(result.indicadores.emitidos), 0) }}</strong><p><span class="numeric">{{ formatFixed(result.indicadores.mediaMensalMtr, 1) }}</span> MTR por mês, em média</p><span class="kpi-footnote">Pela data agendada</span>
        </section>
        <section class="data-card kpi-card">
          <div class="kpi-label">
            <span>Com CDF</span><FileCheck2
              :size="20"
              aria-hidden="true"
            />
          </div><strong class="kpi-value numeric">{{ formatFixed(String(result.indicadores.comCdf), 0) }}</strong><div class="kpi-progress">
            <span :style="{ width: `${Math.min(100, Number(result.indicadores.percentualComCdf))}%` }" />
          </div><p><span class="numeric">{{ formatFixed(result.indicadores.percentualComCdf, 1) }}%</span> dos MTR do período</p>
        </section>
        <section class="data-card kpi-card">
          <div class="kpi-label">
            <span>Sem CDF</span><CircleAlert
              :size="20"
              aria-hidden="true"
            />
          </div><strong class="kpi-value numeric">{{ formatFixed(String(result.indicadores.semCdf), 0) }}</strong><p><span class="numeric">{{ formatFixed(result.indicadores.percentualSemCdf, 1) }}%</span> dos MTR do período</p><span class="kpi-pending-label">Inclui coletas agendadas</span>
        </section>
        <section class="data-card kpi-card">
          <div class="kpi-label">
            <span>Saldo do período</span><TrendingUp
              :size="20"
              aria-hidden="true"
            />
          </div><strong
            class="kpi-value kpi-money numeric"
            :class="Number(result.indicadores.saldo) < 0 ? 'amount-negative' : 'amount-positive'"
          ><small>R$</small> {{ formatFixed(result.indicadores.saldo) }}</strong><p><span class="numeric">{{ formatFixed(result.indicadores.toneladas, 3) }} t</span> destinadas</p><span class="kpi-footnote">Somente coletas realizadas</span>
        </section>
      </div>
      <div class="dashboard-top-row">
        <section
          class="data-card dashboard-panel"
          aria-labelledby="finance-title"
        >
          <div class="dashboard-panel-heading">
            <div>
              <h2 id="finance-title">
                Receita e despesa
              </h2><p>Movimento mensal pela data de realização</p>
            </div><span class="panel-period">{{ result.periodo.meses }} meses</span>
          </div><div class="finance-total">
            <span>Receita <strong class="numeric">R$ {{ formatFixed(result.indicadores.receita) }}</strong></span><span>Despesa <strong class="numeric">R$ {{ formatFixed(result.indicadores.despesa) }}</strong></span>
          </div><DashboardChart
            title="Receita e despesa por mês"
            :months="months"
            :series="finance"
            unit="R$"
          />
        </section>
        <section
          class="attention-card"
          aria-labelledby="attention-title"
        >
          <div class="attention-title">
            <span class="attention-icon"><CircleAlert
              :size="22"
              aria-hidden="true"
            /></span><span class="attention-scope">Situação atual<br />Sem filtro de período</span>
          </div><h2 id="attention-title">
            Precisa de atenção
          </h2><strong class="attention-total numeric">{{ formatFixed(String(result.atencao.total), 0) }}</strong><p>coleta(s) realizadas sem CDF</p><ol
            v-if="result.atencao.itens.length"
            class="attention-list"
            tabindex="0"
            aria-label="Até cinco pendências mais antigas"
          >
            <li
              v-for="item in result.atencao.itens"
              :key="item.id"
            >
              <RouterLink :to="`/coletas/${item.id}/editar`"><strong>{{ item.numeroMtr }}</strong><span>{{ item.cliente.nome }}</span><small>Realizada em {{ formatDate(item.dataRealizada) }}</small></RouterLink>
            </li>
          </ol><div
            v-else
            class="attention-empty"
          >
            <CheckCircle2
              :size="25"
              aria-hidden="true"
            /><p>Nenhuma pendência de CDF em coletas realizadas.</p>
          </div><p
            v-if="result.atencao.total > 5"
            class="attention-caption"
          >
            Exibindo as 5 mais antigas de {{ result.atencao.total }}.
          </p><RouterLink
            class="attention-link"
            to="/coletas?status=Realizada&semCdf=true"
          >{{ result.atencao.total ? 'Ver pendências e registrar CDF' : 'Consultar coletas' }}<ArrowRight
            :size="17"
            aria-hidden="true"
          /></RouterLink>
        </section>
      </div>
      <div class="dashboard-middle-row">
        <section
          class="data-card dashboard-panel"
          aria-labelledby="trace-title"
        >
          <div class="dashboard-panel-heading">
            <div>
              <h2 id="trace-title">
                Rastreabilidade dos MTR
              </h2><p>Com e sem CDF, pela data agendada</p>
            </div>
          </div><DashboardChart
            title="Rastreabilidade mensal dos MTR"
            :months="months"
            :series="traceability"
            stacked
            :scale="0"
            unit="MTR"
          />
        </section>
        <section
          class="data-card dashboard-panel"
          aria-labelledby="residues-title"
        >
          <div class="dashboard-panel-heading">
            <div>
              <h2 id="residues-title">
                Composição por resíduo
              </h2><p>Peso destinado nas coletas realizadas</p>
            </div>
          </div><p class="residue-total numeric">
            {{ formatFixed(result.indicadores.toneladas, 3) }} <span>toneladas no período</span>
          </p><div
            v-if="!result.composicaoResiduos.length"
            class="empty-state residue-empty"
          >
            <Info
              :size="26"
              aria-hidden="true"
            /><h3>Nenhum peso destinado no período.</h3><p>As coletas aparecem aqui depois de realizadas.</p><RouterLink
              class="button-quiet"
              to="/coletas"
            >Consultar coletas</RouterLink>
          </div><div
            v-else
            class="residue-ranking"
            role="region"
            aria-label="Ranking dos resíduos por toneladas"
            tabindex="0"
          >
            <ol>
              <li
                v-for="(item, index) in result.composicaoResiduos"
                :key="item.tipoResiduo"
              >
                <div><span class="residue-position numeric">{{ index + 1 }}</span><strong>{{ item.tipoResiduo }}</strong><span class="numeric">{{ formatFixed(item.toneladas, 3) }} t</span></div><div class="residue-track">
                  <span :style="{ width: `${Math.min(100, Number(item.percentual))}%` }" />
                </div><span class="residue-percent numeric">{{ formatFixed(item.percentual, 1) }}% do peso destinado</span>
              </li>
            </ol>
          </div>
        </section>
      </div>
      <section
        class="data-card dashboard-panel evolution-panel"
        aria-labelledby="evolution-title"
      >
        <div class="dashboard-panel-heading">
          <div>
            <h2 id="evolution-title">
              Evolução mensal
            </h2><p>{{ metricLabel }} pela data de realização</p>
          </div><div
            class="metric-toggle"
            role="group"
            aria-label="Métrica da evolução mensal"
          >
            <button
              v-for="item in metrics"
              :key="item.key"
              type="button"
              :aria-pressed="metric === item.key"
              @click="changeMetric(item.key)"
            >
              {{ item.label }}
            </button>
          </div>
        </div><DashboardChart
          :title="`Evolução mensal de ${metricLabel.toLowerCase()}`"
          :months="months"
          :series="evolution"
          kind="line"
          :unit="metric === 'toneladas' ? 't' : 'R$'"
          :scale="metric === 'toneladas' ? 3 : 2"
        />
      </section>
      <details class="dashboard-method">
        <summary>
          <Info
            :size="17"
            aria-hidden="true"
          />Como interpretar os indicadores
        </summary><p>MTR emitidos incluem agendadas e realizadas pela data agendada. Receita, despesa, saldo e toneladas consideram somente realizadas pela data de realização. O CDF reflete a situação atual do documento, mesmo se recebido depois do período. Meses sem movimento aparecem zerados. Pendências ambientais são somente realizadas sem CDF e ignoram o período selecionado.</p>
      </details>
    </template>
  </PortalLayout>
</template>
