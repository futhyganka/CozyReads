import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

import 'primeicons/primeicons.css';
import './assets/cozyreads.css';

import App from './App.vue';
import router from './router';
import CozyReadsPreset from './themes/cozyreads.preset';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: CozyReadsPreset,
        options: {
            darkModeSelector: false,
            cssLayer: false,
        },
    },
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');
