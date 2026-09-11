<template>
  <IonPage>
    <IonContent :fullscreen="true" class="landing">
      <div class="wrap">
        <!-- Hero ------------------------------------------------------ -->
        <header class="hero ct-enter">
          <span class="hero__mark">
            <IonIcon :icon="checkmarkDoneOutline" />
          </span>

          <h1 class="hero__title">
            Class<br />
            <span class="hero__title-accent">Trackerbonia</span>
          </h1>

          <p class="hero__tagline">Smart Class Attendance Tracker</p>

          <p class="hero__copy">
            A modern way to manage students, attendance, and classroom records.
          </p>
        </header>

        <!-- Dashboard preview: presentation only, no data is read or written -->
        <section class="preview ct-enter" aria-hidden="true">
          <div class="preview__bar">
            <span class="preview__dot" />
            <span class="preview__label">Today&rsquo;s Overview</span>
          </div>

          <div class="preview__grid">
            <div class="preview__cell">
              <span class="preview__key">Total Students</span>
              <span class="preview__value">42</span>
            </div>
            <div class="preview__cell">
              <span class="preview__key">Present</span>
              <span class="preview__value preview__value--present">32</span>
            </div>
            <div class="preview__cell">
              <span class="preview__key">Absent</span>
              <span class="preview__value preview__value--absent">5</span>
            </div>
            <div class="preview__cell">
              <span class="preview__key">Late</span>
              <span class="preview__value preview__value--late">3</span>
            </div>
          </div>

          <div class="preview__rate">
            <div class="preview__rate-head">
              <span class="preview__key">Attendance Rate</span>
              <span class="preview__rate-value">76%</span>
            </div>
            <div class="ct-meter"><div class="ct-meter__fill" style="width: 76%" /></div>
          </div>
        </section>

        <!-- Actions --------------------------------------------------- -->
        <div class="actions ct-enter">
          <IonButton expand="block" class="ct-button-primary" @click="go('/signup')">
            Get Started
          </IonButton>
          <IonButton expand="block" class="ct-button-secondary login" @click="go('/login')">
            Log In
          </IonButton>
        </div>

        <!-- Features -------------------------------------------------- -->
        <ul class="features ct-enter">
          <li v-for="feature in features" :key="feature.title" class="feature">
            <span class="feature__icon"><IonIcon :icon="feature.icon" /></span>
            <div>
              <p class="feature__title">{{ feature.title }}</p>
              <p class="feature__copy">{{ feature.copy }}</p>
            </div>
          </li>
        </ul>

        <div class="ct-safe-bottom" />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue';
import {
  barChartOutline,
  checkmarkDoneOutline,
  createOutline,
  peopleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

const router = useRouter();

function go(path: string): void {
  router.push(path);
}

const features = [
  {
    icon: createOutline,
    title: 'Attendance Tracking',
    copy: 'Record and manage attendance efficiently.',
  },
  {
    icon: peopleOutline,
    title: 'Student Management',
    copy: 'Keep your class list organized.',
  },
  {
    icon: barChartOutline,
    title: 'Attendance Records',
    copy: 'Review attendance history anytime.',
  },
  {
    icon: shieldCheckmarkOutline,
    title: 'Role-Based Access',
    copy: 'Students and administrators get the appropriate level of access.',
  },
];
</script>

<style scoped>
.landing {
  --background: var(--ct-bg);
  --padding-start: 0;
  --padding-end: 0;
}

.wrap {
  padding: calc(28px + var(--ion-safe-area-top, 0px)) 20px 0;
}

/* Hero ------------------------------------------------------------------ */
.hero {
  padding-top: 12px;
}

.hero__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--ct-r-md);
  margin-bottom: 22px;
  font-size: 23px;
  color: var(--ct-accent);
  background: var(--ct-accent-soft);
  border: 1px solid var(--ct-accent-line);
}

.hero__title {
  margin: 0;
  font-size: 38px;
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.04em;
  color: var(--ct-text);
}

.hero__title-accent {
  color: var(--ct-accent);
}

.hero__tagline {
  margin: 14px 0 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.hero__copy {
  margin: 12px 0 0;
  max-width: 300px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ct-text-2);
}

/* Preview --------------------------------------------------------------- */
.preview {
  margin-top: 26px;
  padding: 14px;
  background: var(--ct-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-r-lg);
}

.preview__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ct-border-soft);
}

.preview__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ct-accent);
}

.preview__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ct-text-3);
}

.preview__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 0;
}

.preview__cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preview__key {
  font-size: 11.5px;
  color: var(--ct-text-3);
}

.preview__value {
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.03em;
  color: var(--ct-text);
  font-variant-numeric: tabular-nums;
}

.preview__value--present {
  color: var(--ct-present);
}
.preview__value--absent {
  color: var(--ct-absent);
}
.preview__value--late {
  color: var(--ct-late);
}

.preview__rate {
  padding-top: 12px;
  border-top: 1px solid var(--ct-border-soft);
}

.preview__rate-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 9px;
}

.preview__rate-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--ct-accent);
  font-variant-numeric: tabular-nums;
}

/* Actions --------------------------------------------------------------- */
.actions {
  margin-top: 26px;
}

.login {
  margin-top: 10px;
}

/* Features -------------------------------------------------------------- */
.features {
  list-style: none;
  margin: 28px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}

.feature + .feature {
  border-top: 1px solid var(--ct-border-soft);
}

.feature__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: var(--ct-r-sm);
  font-size: 16px;
  color: var(--ct-text-2);
  background: var(--ct-elevated);
  border: 1px solid var(--ct-border);
}

.feature__title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ct-text);
}

.feature__copy {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ct-text-2);
}
</style>
