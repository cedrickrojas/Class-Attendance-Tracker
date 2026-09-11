<template>
  <IonPage>
    <IonContent :fullscreen="true" class="auth">
      <div class="wrap">
        <button type="button" class="back" @click="router.replace('/')">
          <IonIcon :icon="chevronBack" />
          Back
        </button>

        <header class="head ct-enter">
          <h1 class="head__title">Create Your Account</h1>
          <p class="head__copy">Create your Class Trackerbonia student account.</p>
        </header>

        <!--
          There is deliberately no role field here. Every account created through
          this form is a student; the role is assigned in services/auth.ts and
          enforced again by the Firestore rules.
        -->
        <form class="form ct-enter" @submit.prevent="submit">
          <IonList class="ct-field-list">
            <IonItem :class="{ 'field--invalid': invalidField === 'fullName' }">
              <IonInput
                v-model="form.fullName"
                label="Full Name"
                label-placement="stacked"
                placeholder="Juan Dela Cruz"
                autocapitalize="words"
                autocomplete="name"
                :maxlength="80"
                :disabled="busy"
                enterkeyhint="next"
              />
            </IonItem>
            <IonItem :class="{ 'field--invalid': invalidField === 'courseSection' }">
              <IonInput
                v-model="form.courseSection"
                label="Course / Section"
                label-placement="stacked"
                placeholder="BSIT 4-A"
                autocapitalize="characters"
                :maxlength="40"
                :disabled="busy"
                enterkeyhint="next"
              />
            </IonItem>
            <IonItem :class="{ 'field--invalid': invalidField === 'email' }">
              <IonInput
                v-model="form.email"
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
            <IonItem :class="{ 'field--invalid': invalidField === 'password' }">
              <IonInput
                v-model="form.password"
                label="Password"
                label-placement="stacked"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="At least 6 characters"
                :disabled="busy"
                enterkeyhint="next"
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
            <IonItem lines="none" :class="{ 'field--invalid': invalidField === 'confirm' }">
              <IonInput
                v-model="confirmPassword"
                label="Confirm Password"
                label-placement="stacked"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Re-enter your password"
                :disabled="busy"
                enterkeyhint="go"
              />
            </IonItem>
          </IonList>

          <p class="hint">
            <IonIcon :icon="informationCircleOutline" />
            Your Student ID is generated automatically when your account is created. You will see
            it on your dashboard.
          </p>

          <p v-if="error" class="error" role="alert">
            <IonIcon :icon="alertCircleOutline" />
            {{ error }}
          </p>

          <IonButton
            expand="block"
            type="submit"
            class="ct-button-primary submit"
            :disabled="busy"
          >
            <IonSpinner v-if="busy" name="crescent" class="spinner" />
            {{ busy ? 'Creating account…' : 'Create Account' }}
          </IonButton>
        </form>

        <p class="foot">
          Already have an account?
          <button type="button" class="link" @click="router.replace('/login')">Log In</button>
        </p>

        <div class="ct-safe-bottom" />
      </div>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
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
  chevronBack,
  eyeOffOutline,
  eyeOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { useAuth } from '@/composables/useAuth';
import { useFeedback } from '@/composables/useFeedback';

const router = useRouter();
const { signup, busy } = useAuth();
const { messageOf, showToast } = useFeedback();

const form = reactive({ fullName: '', courseSection: '', email: '', password: '' });
const confirmPassword = ref('');
const showPassword = ref(false);
const error = ref('');
const invalidField = ref<
  'fullName' | 'courseSection' | 'email' | 'password' | 'confirm' | ''
>('');

function fail(message: string, field: typeof invalidField.value): false {
  error.value = message;
  invalidField.value = field;
  return false;
}

function validate(): boolean {
  if (!form.fullName.trim()) return fail('Full name is required.', 'fullName');
  if (!form.courseSection.trim()) return fail('Course / Section is required.', 'courseSection');
  if (!form.email.trim()) return fail('Email address is required.', 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return fail('Please enter a valid email address.', 'email');
  }
  if (!form.password) return fail('Password is required.', 'password');
  if (form.password.length < 6) {
    return fail('Password must be at least 6 characters.', 'password');
  }
  if (!confirmPassword.value) return fail('Please confirm your password.', 'confirm');
  if (form.password !== confirmPassword.value) {
    return fail('Passwords do not match.', 'confirm');
  }

  error.value = '';
  invalidField.value = '';
  return true;
}

async function submit(): Promise<void> {
  if (busy.value || !validate()) return;

  try {
    const profile = await signup({
      fullName: form.fullName,
      courseSection: form.courseSection,
      email: form.email,
      password: form.password,
    });
    // Show the assigned ID immediately - the student never chose it.
    await showToast(`Welcome, ${profile.fullName}. Your Student ID is ${profile.studentId}.`);
    router.replace('/tabs/home');
  } catch (err) {
    error.value = messageOf(err, 'Could not create your account. Please try again.');
    invalidField.value = '';
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
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.15;
  color: var(--ct-text);
}

.head__copy {
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--ct-text-2);
}

.form {
  margin-top: 24px;
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

.hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ct-text-3);
}

.hint ion-icon {
  font-size: 15px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 2px 0;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.45;
  color: var(--ct-absent);
}

.error ion-icon {
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

.foot {
  margin: 26px 0 0;
  text-align: center;
  font-size: 14px;
  color: var(--ct-text-2);
}
</style>
