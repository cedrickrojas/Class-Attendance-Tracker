<template>
  <IonPage>
    <IonTabs>
      <IonRouterOutlet />

      <IonTabBar slot="bottom" class="tab-bar">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon :icon="gridOutline" aria-hidden="true" />
          <IonLabel>Home</IonLabel>
        </IonTabButton>

        <IonTabButton tab="students" href="/tabs/students">
          <IonIcon :icon="peopleOutline" aria-hidden="true" />
          <IonLabel>Students</IonLabel>
        </IonTabButton>

        <IonTabButton tab="attendance" href="/tabs/attendance">
          <IonIcon :icon="createOutline" aria-hidden="true" />
          <IonLabel>Attendance</IonLabel>
        </IonTabButton>

        <IonTabButton tab="records" href="/tabs/records">
          <IonIcon :icon="barChartOutline" aria-hidden="true" />
          <IonLabel>Records</IonLabel>
        </IonTabButton>

        <IonTabButton tab="settings" href="/tabs/settings">
          <IonIcon :icon="settingsOutline" aria-hidden="true" />
          <IonLabel>Settings</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue';
import {
  barChartOutline,
  createOutline,
  gridOutline,
  peopleOutline,
  settingsOutline,
} from 'ionicons/icons';
</script>

<style scoped>
/* Flat dark bar with a hairline top edge; the home indicator gets its own room. */
.tab-bar {
  --background: var(--ct-bg-2);
  --border: 1px solid var(--ct-border-soft);
  --color: var(--ct-text-3);
  --color-selected: var(--ct-accent);
  padding-bottom: var(--ion-safe-area-bottom, 0px);
  height: calc(54px + var(--ion-safe-area-bottom, 0px));
}

.tab-bar ion-tab-button {
  --color: var(--ct-text-3);
  --color-selected: var(--ct-accent);
  --background-focused: transparent;
  --ripple-color: transparent;
}

.tab-bar ion-icon {
  font-size: 21px;
  margin-bottom: 1px;
}

.tab-bar ion-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
