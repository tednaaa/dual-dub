import { en, ru, shonkUI } from 'shonk-ui';
import { createApp } from 'vue';

import App from './App.vue';

import './style.css';

const language = browser.i18n.getUILanguage();
document.documentElement.lang = language;

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const applyScheme = () => document.documentElement.classList.toggle('dark', darkScheme.matches);
applyScheme();
darkScheme.addEventListener('change', applyScheme);

createApp(App).use(shonkUI, { locale: language.startsWith('ru') ? ru : en }).mount('#app');
