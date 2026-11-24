<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { coletasApi } from '../services/coletas';
const props = withDefaults(defineProps<{ modelValue: string; error?: string; required?: boolean; disabled?: boolean }>(), { error: '', required: false, disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const id = useId();
const options = ref<string[]>([]);
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let revision = 0;
watch(() => props.modelValue, () => {
  clearTimeout(timer); controller?.abort();
  const current = ++revision;
  timer = setTimeout(async () => {
    controller = new AbortController();
    try { const result = await coletasApi.residuos(props.modelValue, controller.signal); if (current === revision) options.value = result.itens; }
    catch { if (current === revision) options.value = []; }
  }, 300);
}, { immediate: true });
onBeforeUnmount(() => { revision++; clearTimeout(timer); controller?.abort(); });
</script>
<template>
  <div class="form-field">
    <label :for="id">Tipo de resíduo{{ required ? ' (obrigatório)' : '' }}</label>
    <input
      :id="id"
      :value="modelValue"
      :name="`${id}-residuo`"
      autocomplete="off"
      :list="`${id}-options`"
      maxlength="160"
      placeholder="Ex.: Papel reciclável"
      :disabled="disabled"
      :required="required"
      :aria-invalid="!!error"
      :aria-describedby="`${id}-hint`"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <datalist :id="`${id}-options`">
      <option
        v-for="option in options"
        :key="option"
        :value="option"
      />
    </datalist>
    <p
      :id="`${id}-hint`"
      :class="error ? 'field-error' : 'field-hint'"
    >
      {{ error || (required ? 'Reutilize uma sugestão ou informe um novo tipo.' : 'Correspondência exata com o tipo cadastrado.') }}
    </p>
  </div>
</template>
