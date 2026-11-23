<script setup lang="ts">
import { ChartNoAxesCombined, FileCheck2, ShieldCheck, Truck } from '@lucide/vue';
import BrandMark from './BrandMark.vue';
</script>

<template>
  <div class="auth-layout">
    <aside
      class="auth-story"
      aria-label="Sobre o portal"
    >
      <BrandMark light />
      <div class="story-content">
        <span class="story-eyebrow">Portal de coletas e indicadores</span>
        <p class="story-title">
          Uma operação<br />mais clara.<br /><span>De ponta a ponta.</span>
        </p>
        <p class="story-description">
          Conecte cada etapa da coleta a uma gestão ambiental mais organizada e responsável.
        </p>
        <ul class="story-features">
          <li>
            <span class="feature-icon"><Truck
              :size="20"
              aria-hidden="true"
            /></span><span>Coletas organizadas<small>Acompanhe cada etapa da operação.</small></span>
          </li>
          <li>
            <span class="feature-icon"><FileCheck2
              :size="20"
              aria-hidden="true"
            /></span><span>Rastreabilidade de documentos<small>MTR e CDF no mesmo lugar.</small></span>
          </li>
          <li>
            <span class="feature-icon"><ChartNoAxesCombined
              :size="20"
              aria-hidden="true"
            /></span><span>Indicadores que orientam<small>Clareza para tomar decisões.</small></span>
          </li>
        </ul>
      </div>
      <p class="story-footer">
        <ShieldCheck
          :size="16"
          aria-hidden="true"
        /> Informação conectada. Gestão responsável.
      </p>
    </aside>
    <div class="auth-main">
      <div class="auth-mobile-brand">
        <BrandMark />
      </div>
      <main
        id="conteudo"
        class="auth-form-container"
        tabindex="-1"
      >
        <slot />
      </main>
      <footer class="auth-footer">
        EcoColeta · Empresa fictícia para demonstração
      </footer>
    </div>
  </div>
</template>
