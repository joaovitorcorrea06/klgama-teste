<script setup lang="ts">
import { ref } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';
const model = defineModel<string>({ default: '' });
defineProps<{ id: string; label?: string; autocomplete: 'current-password' | 'new-password'; error?: string; hint?: string; disabled?: boolean }>();
const visible = ref(false);
</script>

<template>
  <div class="form-field">
    <label :for="id">{{ label || 'Senha' }}</label>
    <div class="password-input">
      <input
        :id="id"
        v-model="model"
        :name="id"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :disabled="disabled"
        required
        :aria-invalid="!!error"
        :aria-describedby="[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined"
      />
      <button
        type="button"
        :disabled="disabled"
        class="password-toggle"
        :aria-label="visible ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="visible"
        :aria-controls="id"
        @click="visible = !visible"
      >
        <component
          :is="visible ? EyeOff : Eye"
          :size="19"
          aria-hidden="true"
        />
      </button>
    </div>
    <p
      v-if="hint"
      :id="`${id}-hint`"
      class="field-hint"
    >
      {{ hint }}
    </p>
    <p
      v-if="error"
      :id="`${id}-error`"
      class="field-error"
    >
      {{ error }}
    </p>
  </div>
</template>
