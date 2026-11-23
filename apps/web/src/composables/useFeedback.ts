import { readonly, ref } from 'vue';

const message = ref('');
export const feedback = readonly(message);
export function showSuccess(value: string): void { message.value = value; }
export function clearFeedback(): void { message.value = ''; }
