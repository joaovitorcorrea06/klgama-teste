import { createApp } from 'vue';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/auth.css';
import './styles/clientes.css';
import './styles/coletas.css';
import './styles/painel.css';
import App from './App.vue';
import { router } from './router';

createApp(App).use(router).mount('#app');
