<script setup lang="ts">
defineProps<{ light?: boolean }>();
</script>

<template>
  <span
    class="brand"
    :class="{ 'brand-light': light }"
  >
    <span
      class="brand-mark"
      aria-hidden="true"
    >e<span>.</span></span>
    <span>EcoColeta<small>Gestão ambiental</small></span>
  </span>
</template>
