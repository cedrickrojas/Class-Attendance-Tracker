<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Settings</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <SectionHeader title="Account" subtitle="Signed in to Class Trackerbonia" />

      <IonList class="group">
        <IonItem>
          <IonIcon slot="start" :icon="personCircleOutline" />
          <IonLabel>
            <h3>{{ profile?.fullName || 'Not signed in' }}</h3>
            <p>{{ profile?.email }}</p>
          </IonLabel>
        </IonItem>
        <IonItem v-if="profile?.studentId">
          <IonIcon slot="start" :icon="idCardOutline" />
          <IonLabel>Student ID</IonLabel>
          <IonNote slot="end">{{ profile.studentId }}</IonNote>
        </IonItem>
        <IonItem lines="none">
          <IonIcon slot="start" :icon="shieldCheckmarkOutline" />
          <IonLabel>Role</IonLabel>
          <span slot="end" class="role" :class="isAdmin ? 'role--admin' : 'role--student'">
            {{ isAdmin ? 'Administrator' : 'Student' }}
          </span>
        </IonItem>
      </IonList>

      <SectionHeader title="Appearance" subtitle="How the app looks on this device" />

      <IonList class="group">
        <IonRadioGroup :value="mode" @ionChange="onModeChange">
          <IonItem>
            <IonIcon slot="start" :icon="phonePortraitOutline" />
            <IonRadio value="system" justify="space-between">System Theme</IonRadio>
          </IonItem>
          <IonItem>
            <IonIcon slot="start" :icon="moonOutline" />
            <IonRadio value="dark" justify="space-between">Dark Mode</IonRadio>
          </IonItem>
          <IonItem lines="none">
            <IonIcon slot="start" :icon="sunnyOutline" />
            <IonRadio value="light" justify="space-between">Light Mode</IonRadio>
          </IonItem>
        </IonRadioGroup>
      </IonList>

      <p class="note">System Theme follows your iPhone and switches automatically.</p>

      <SectionHeader v-if="isAdmin" title="Data" subtitle="Firebase Firestore" />

      <IonList v-if="isAdmin" class="group">
        <IonItem>
          <IonIcon slot="start" :icon="cloudOutline" />
          <IonLabel>
            <h3>Database Status</h3>
            <p>{{ isFirebaseConfigured ? 'Connected' : 'Not configured' }}</p>
          </IonLabel>
          <span
            slot="end"
            class="status-dot"
            :class="isFirebaseConfigured ? 'status-dot--ok' : 'status-dot--warn'"
          />
        </IonItem>
        <IonItem button :detail="true" lines="none" @click="reloadData">
          <IonIcon slot="start" :icon="refreshOutline" />
          <IonLabel>Refresh Data</IonLabel>
        </IonItem>
      </IonList>

      <SectionHeader title="About" />

      <IonList class="group">
        <IonItem>
          <IonLabel>
            <h3>Class Trackerbonia</h3>
            <p>Smart Class Attendance Tracker</p>
          </IonLabel>
        </IonItem>
        <IonItem>
          <IonLabel>Version</IonLabel>
          <IonNote slot="end">1.0.0</IonNote>
        </IonItem>
        <IonItem>
          <IonLabel>Students</IonLabel>
          <IonNote slot="end">{{ students.length }}</IonNote>
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Attendance Records</IonLabel>
          <IonNote slot="end">{{ attendance.length }}</IonNote>
        </IonItem>
      </IonList>

      <IonButton expand="block" class="ct-button-secondary logout" @click="confirmLogout">
        <IonIcon slot="start" :icon="logOutOutline" />
        Log Out
      </IonButton>

      <div class="ct-safe-bottom" />
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import {
  cloudOutline,
  idCardOutline,
  logOutOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  moonOutline,
  phonePortraitOutline,
  refreshOutline,
  sunnyOutline,
} from 'ionicons/icons';
import SectionHeader from '@/components/SectionHeader.vue';
import { useRouter } from 'vue-router';
import { useAppearance, type AppearanceMode } from '@/composables/useAppearance';
import { useAuth } from '@/composables/useAuth';
import { useClassData } from '@/composables/useClassData';
import { useFeedback } from '@/composables/useFeedback';
import { isFirebaseConfigured } from '@/firebase';

const router = useRouter();
const { mode, setMode } = useAppearance();
const { profile, isAdmin, logout } = useAuth();
const { students, attendance, refreshAll, ensureLoaded } = useClassData();
const { showToast, showError, confirm } = useFeedback();

async function confirmLogout(): Promise<void> {
  const ok = await confirm({
    header: 'Log out of Class Trackerbonia?',
    message: 'You will need to sign in again to record or view attendance.',
    confirmText: 'Log Out',
    destructive: true,
  });
  if (!ok) return;

  try {
    await logout();
    router.replace('/');
  } catch (error) {
    await showError(error, 'Could not log you out. Please try again.');
  }
}

// Settings is a tab now, so it can be the first screen opened - the counts below
// would otherwise read zero until another tab loaded the data.
onIonViewWillEnter(async () => {
  if (!isFirebaseConfigured) return;
  try {
    await ensureLoaded();
  } catch {
    // The Database Status row already reports the problem.
  }
});

function onModeChange(event: CustomEvent): void {
  setMode((event.detail as { value: AppearanceMode }).value);
}

async function reloadData(): Promise<void> {
  try {
    await refreshAll();
    await showToast('Data reloaded from Firebase.');
  } catch (error) {
    await showError(error, 'Could not reload the data.');
  }
}
</script>

<style scoped>
.group {
  margin: 0;
  padding: 0;
  background: var(--ct-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-lg);
  overflow: hidden;
}

.group ion-item {
  --background: var(--ct-card);
  --background-activated: var(--ct-elevated);
  --border-color: var(--ct-border-soft);
  --padding-start: 14px;
  --inner-padding-end: 14px;
  --min-height: 54px;
  --color: var(--ct-text);
  font-size: 15px;
}

.group ion-icon[slot='start'] {
  color: var(--ct-text-2);
  font-size: 18px;
  margin-inline-end: 12px;
}

.group ion-label h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--ct-text);
}

.group ion-label p {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ct-text-2);
}

.group ion-note {
  font-size: 14px;
  color: var(--ct-text-2);
  font-variant-numeric: tabular-nums;
}

.group ion-radio {
  --color: var(--ct-text-2);
  --color-checked: var(--ct-accent);
  font-size: 15px;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  align-self: center;
}

.status-dot--ok {
  background: var(--ct-present);
  box-shadow: 0 0 0 3px var(--ct-present-soft);
}

.status-dot--warn {
  background: var(--ct-late);
  box-shadow: 0 0 0 3px var(--ct-late-soft);
}

.role {
  align-self: center;
  padding: 3px 9px;
  border-radius: var(--ct-r-chip);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.role--admin {
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.role--student {
  color: var(--ct-text-2);
  background: var(--ct-elevated);
  border: 1px solid var(--ct-border);
}

.logout {
  margin-top: 26px;
  --color: var(--ct-absent);
  --border-color: var(--ct-absent);
}

.note {
  margin: 10px 4px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ct-text-3);
}
</style>
