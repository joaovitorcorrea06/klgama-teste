<template>
  <a
    class="skip-link"
    href="#conteudo"
  >Ir para o conteúdo</a>
  <header class="site-header">
    <RouterLink
      class="brand"
      to="/"
      aria-label="EcoColeta, início"
    >
      <span
        class="brand-mark"
        aria-hidden="true"
      >e<span>.</span></span>
      <span>EcoColeta<small>Gestão ambiental</small></span>
    </RouterLink>
    <span class="header-context">Portal de Coletas</span>
  </header>
  <main
    id="conteudo"
    tabindex="-1"
  >
    <RouterView />
  </main>
  <footer class="site-footer">
    EcoColeta · Empresa fictícia para demonstração
  </footer>
</template>
