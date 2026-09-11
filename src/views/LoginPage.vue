<template>
  <IonPage>
    <IonContent :fullscreen="true" class="auth">
      <div class="wrap">
        <button type="button" class="back" @click="router.replace('/')">
          <IonIcon :icon="chevronBack" />
          Back
        </button>

        <header class="head ct-enter">
          <h1 class="head__title">Welcome Back</h1>
          <p class="head__brand">Class Trackerbonia</p>
          <p class="head__copy">Sign in to continue to your dashboard.</p>
        </header>

        <form class="form ct-enter" @submit.prevent="submit">
          <IonList class="ct-field-list">
            <IonItem :class="{ 'field--invalid': invalidField === 'email' }">
              <IonInput
                v-model="email"
                label="Email Address"
                label-placement="stacked"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="you@example.com"
                :disabled="busy"
                enterkeyhint="next"
              />
            </IonItem>
            <IonItem lines="none" :class="{ 'field--invalid': invalidField === 'password' }">
              <IonInput
                v-model="password"
                label="Password"
                label-placement="stacked"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Your password"
                :disabled="busy"
                enterkeyhint="go"
              />
              <IonButton
                slot="end"
                fill="clear"
                class="reveal"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <IonIcon slot="icon-only" :icon="showPassword ? eyeOffOutline : eyeOutline" />
              </IonButton>
            </IonItem>
          </IonList>

          <p v-if="error" class="error" role="alert">
            <IonIcon :icon="alertCircleOutline" />
            {{ error }}
          </p>

          <p v-if="notice" class="notice" role="status">
            <IonIcon :icon="checkmarkCircleOutline" />
            {{ notice }}
          </p>

          <IonButton
            expand="block"
            type="submit"
            class="ct-button-primary submit"
            :disabled="busy"
          >
            <IonSpinner v-if="busy" name="crescent" class="spinner" />
            {{ busy ? 'Signing in…' : 'Log In' }}
          </IonButton>

          <button type="button" class="link forgot" :disabled="busy" @click="forgotPassword">
            Forgot password?
          </button>
        </form>

        <p class="foot">
          Don&rsquo;t have an account?
          <button type="button" class="link" @click="router.replace('/signup')">
            Create Account
          </button>
        </p>

        <div class="ct-safe-bottom" />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonSpinner,
} from '@ionic/vue';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronBack,
  eyeOffOutline,
  eyeOutline,
} from 'ionicons/icons';
import { useAuth } from '@/composables/useAuth';
import { useFeedback } from '@/composables/useFeedback';

const router = useRouter();
const { login, resetPassword, busy } = useAuth();
const { messageOf, showToast } = useFeedback();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const notice = ref('');
const invalidField = ref<'email' | 'password' | ''>('');

function validate(): boolean {
  notice.value = '';
  if (!email.value.trim()) {
    error.value = 'Email address is required.';
    invalidField.value = 'email';
    return false;
  }
  if (!password.value) {
    error.value = 'Password is required.';
    invalidField.value = 'password';
    return false;
  }
  error.value = '';
  invalidField.value = '';
  return true;
}

async function submit(): Promise<void> {
  if (busy.value || !validate()) return;

  try {
    const profile = await login(email.value, password.value);
    await showToast(`Signed in as ${profile.fullName}.`);
    // Both roles land on the dashboard; the dashboard itself is role-aware.
    router.replace('/tabs/home');
  } catch (err) {
    error.value = messageOf(err, 'Could not sign you in. Please try again.');
    invalidField.value = '';
  }
}

async function forgotPassword(): Promise<void> {
  if (busy.value) return;

  if (!email.value.trim()) {
    error.value = 'Enter your email address first, then tap Forgot password.';
    invalidField.value = 'email';
    return;
  }

  try {
    await resetPassword(email.value);
    error.value = '';
    invalidField.value = '';
    notice.value = 'Password reset instructions have been sent to your email.';
  } catch (err) {
    error.value = messageOf(err, 'Could not send the reset email. Please try again.');
  }
}
</script>

<style scoped>
.auth {
  --background: var(--ct-bg);
  --padding-start: 0;
  --padding-end: 0;
}

.wrap {
  padding: calc(20px + var(--ion-safe-area-top, 0px)) 20px 0;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 8px 10px 8px 4px;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 550;
  color: var(--ct-accent);
  cursor: pointer;
}

.back ion-icon {
  font-size: 18px;
}

.head {
  margin-top: 20px;
}

.head__title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--ct-text);
}

.head__brand {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ct-accent);
}

.head__copy {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--ct-text-2);
}

.form {
  margin-top: 28px;
}

.field--invalid {
  --border-color: var(--ct-absent);
  --highlight-color-focused: var(--ct-absent);
}

.reveal {
  --color: var(--ct-text-3);
  --padding-start: 8px;
  --padding-end: 4px;
  margin: 0;
  height: 38px;
}

.error,
.notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.45;
}

.error {
  color: var(--ct-absent);
}

.notice {
  color: var(--ct-present);
}

.error ion-icon,
.notice ion-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.submit {
  margin-top: 22px;
}

.spinner {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--ct-accent);
  cursor: pointer;
}

.forgot {
  display: block;
  margin: 18px auto 0;
}

.foot {
  margin: 30px 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--ct-text-2);
}
</style>
