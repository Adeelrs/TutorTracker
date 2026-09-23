import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import './styles/base.css';
import './styles/utilities.css';

import { bootstrapAuth } from './services/authStore';
import { bootstrapPreferences } from './services/preferencesStore';

bootstrapAuth();
bootstrapPreferences();

createApp(App).use(router).mount('#app');
