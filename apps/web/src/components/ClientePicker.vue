<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { clientesApi, formatCnpj, type Cliente, type ClientesResult } from '../services/clientes';

const props = withDefaults(defineProps<{ modelValue: string; activeOnly?: boolean; error?: string; disabled?: boolean }>(), { activeOnly: true, error: '', disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const id = useId();
const busca = ref('');
const pagina = ref(1);
const result = ref<ClientesResult>();
const selected = ref<Cliente>();
const loading = ref(false);
const failure = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let revision = 0;
let selectionRevision = 0;
async function load(): Promise<void> {
  const current = ++revision;
  controller?.abort(); controller = new AbortController();
  loading.value = true; failure.value = '';
  try {
    const response = await clientesApi.listar({ busca: busca.value.trim(), ativo: props.activeOnly ? 'true' : '', pagina: pagina.value, limite: 20 }, controller.signal);
    if (current === revision) result.value = response;
  } catch (error) { if (current === revision && !controller.signal.aborted) failure.value = error instanceof Error ? error.message : 'Não foi possível buscar clientes.'; }
  finally { if (current === revision) loading.value = false; }
}
function choose(value: string): void {
  selected.value = result.value?.itens.find((cliente) => cliente.id === value) ?? selected.value;
  emit('update:modelValue', value);
}
watch(busca, () => { clearTimeout(timer); timer = setTimeout(() => { pagina.value = 1; void load(); }, 300); });
watch(() => props.modelValue, async (value) => {
  const current = ++selectionRevision;
  if (!value) { selected.value = undefined; return; }
  if (selected.value?.id === value) return;
  try { const cliente = await clientesApi.buscar(value); if (current === selectionRevision) selected.value = cliente; }
  catch (error) { if (current === selectionRevision) failure.value = error instanceof Error ? error.message : 'Cliente indisponível.'; }
}, { immediate: true });
watch(() => props.activeOnly, () => { pagina.value = 1; void load(); }, { immediate: true });
onBeforeUnmount(() => { revision++; selectionRevision++; clearTimeout(timer); controller?.abort(); });
</script>

<template>
  <div class="client-picker form-field">
    <label :for="`${id}-search`">Buscar cliente {{ activeOnly ? 'ativo' : '' }}</label>
    <input
      :id="`${id}-search`"
      v-model="busca"
      type="search"
      placeholder="Nome, CNPJ ou cidade"
      maxlength="150"
      :disabled="disabled"
      :aria-describedby="`${id}-hint`"
    />
    <label
      :for="`${id}-select`"
      class="picker-select-label"
    >Cliente {{ activeOnly ? '(obrigatório)' : '(filtro)' }}</label>
    <div class="select-wrap">
      <select
        :id="`${id}-select`"
        :value="modelValue"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="`${id}-hint ${error ? `${id}-error` : ''}`"
        @change="choose(($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          {{ activeOnly ? 'Selecione um cliente' : 'Todos os clientes' }}
        </option>
        <option
          v-if="selected && !result?.itens.some(c => c.id === selected?.id)"
          :value="selected.id"
        >
          {{ selected.nome }}{{ selected.ativo ? '' : ' (inativo)' }}
        </option>
        <option
          v-for="cliente in result?.itens"
          :key="cliente.id"
          :value="cliente.id"
        >
          {{ cliente.nome }} · {{ formatCnpj(cliente.cnpj) }}{{ cliente.ativo ? '' : ' (inativo)' }}
        </option>
      </select><ChevronDown
        :size="16"
        aria-hidden="true"
      />
    </div>
    <p
      :id="`${id}-hint`"
      class="field-hint"
      role="status"
    >
      {{ loading ? 'Buscando clientes…' : result ? `${result.meta.total} cliente(s) na busca. Refine o texto para localizar.` : 'Pesquise e selecione um cliente.' }}
    </p>
    <p
      v-if="error"
      :id="`${id}-error`"
      class="field-error"
    >
      {{ error }}
    </p>
    <div
      v-if="failure"
      class="picker-error"
      role="alert"
    >
      {{ failure }} <button
        type="button"
        class="button-text"
        :disabled="disabled"
        @click="load"
      >
        Tentar novamente
      </button>
    </div>
    <div
      v-if="result && result.meta.totalPaginas > 1"
      class="picker-pages"
    >
      <button
        type="button"
        class="button-quiet"
        :disabled="disabled || loading || pagina === 1"
        @click="pagina--; load()"
      >
        Anterior
      </button>
      <span>{{ pagina }} / {{ result.meta.totalPaginas }}</span>
      <button
        type="button"
        class="button-quiet"
        :disabled="disabled || loading || pagina >= result.meta.totalPaginas"
        @click="pagina++; load()"
      >
        Próxima
      </button>
    </div>
  </div>
</template>
