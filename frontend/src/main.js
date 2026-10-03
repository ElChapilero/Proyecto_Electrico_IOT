import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/styles/tokens.css';
import './assets/styles/global.css';
import './assets/styles/utilities.css';

createApp(App).use(router).mount('#app');
