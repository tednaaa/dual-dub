import { shonkUI } from 'shonk-ui';
import { createApp } from 'vue';

import App from './App.vue';

import './style.css';

createApp(App).use(shonkUI).mount('#app');
