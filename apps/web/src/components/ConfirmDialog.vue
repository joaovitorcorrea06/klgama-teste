<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';

const props = defineProps<{ open: boolean; title: string; description: string; confirmLabel?: string; danger?: boolean; loading?: boolean; error?: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLDialogElement>();
const id = useId();
let previousFocus: HTMLElement | null = null;
function sync(): void {
  if (!dialog.value) return;
  if (props.open && !dialog.value.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.value.showModal();
  } else if (!props.open && dialog.value.open) {
    dialog.value.close();
    if (previousFocus?.isConnected) previousFocus.focus();
  }
}
watch(() => props.open, () => void nextTick(sync));
onMounted(sync);
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    :aria-labelledby="`${id}-title`"
    :aria-describedby="`${id}-description${error ? ` ${id}-error` : ''}`"
    :aria-busy="loading"
    @cancel.prevent="!loading && emit('cancel')"
  >
    <h2 :id="`${id}-title`">
      {{ title }}
    </h2>
    <p :id="`${id}-description`">
      {{ description }}
    </p>
    <slot />
    <p
      v-if="error"
      :id="`${id}-error`"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div class="dialog-actions">
      <button
        type="button"
        class="button-quiet"
        autofocus
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="button"
        :class="danger ? 'button-danger' : 'button-primary'"
        :disabled="loading"
        @click="emit('confirm')"
      >
        {{ loading ? 'Aguarde…' : confirmLabel || 'Confirmar' }}
      </button>
    </div>
  </dialog>
</template>
