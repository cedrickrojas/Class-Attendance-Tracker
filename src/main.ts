import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';

import App from './App.vue';
import router from './router';
import { initAppearance } from './composables/useAppearance';
import { initAuth } from './composables/useAuth';

/* Core Ionic CSS - required for every Ionic app */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utilities that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Class-based dark palette. Ionic turns dark when the `ion-palette-dark`
 * class is added to <html>, which `useAppearance` controls.
 */
import '@ionic/vue/css/palettes/dark.class.css';

/* App theme variables */
import './theme/variables.css';

// Apply the saved Light / Dark / System choice before the first paint.
initAppearance();

// Start listening for the restored Firebase session. The router guard awaits
// this before deciding any redirect, so a signed-in user is never bounced out
// on a cold start.
initAuth();

const app = createApp(App)
  .use(IonicVue, {
    // Force the iOS look and feel everywhere, including the browser preview.
    mode: 'ios',
  })
  .use(router);

router.isReady().then(() => {
  app.mount('#app');
});
