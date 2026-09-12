import { createRouter, createWebHistory } from '@ionic/vue-router';
import { watch } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import TabsPage from '@/views/TabsPage.vue';
import { useAuth } from '@/composables/useAuth';

const routes: Array<RouteRecordRaw> = [
  /* Public ---------------------------------------------------------------- */
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingPage.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/SignupPage.vue'),
    meta: { public: true },
  },

  /* Protected ------------------------------------------------------------- */
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', name: 'home', component: () => import('@/views/HomePage.vue') },
      { path: 'students', name: 'students', component: () => import('@/views/StudentsPage.vue') },
      {
        // Attendance history for one student. `:id` is the Firestore document id.
        path: 'students/:id',
        name: 'student-detail',
        component: () => import('@/views/StudentDetailPage.vue'),
      },
      {
        // Accepts `?edit=<recordId>` so the Records tab can reuse this form.
        path: 'attendance',
        name: 'attendance',
        component: () => import('@/views/AttendancePage.vue'),
      },
      { path: 'records', name: 'records', component: () => import('@/views/RecordsPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsPage.vue') },
    ],
  },

  /* Anything unknown ------------------------------------------------------ */
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * Auth guard.
 *
 * The `await ready` is the important line: Firebase restores a saved session
 * asynchronously, so deciding before that resolves would bounce a returning user
 * to the landing page on every cold start.
 */
router.beforeEach(async (to) => {
  const { ready, isAuthenticated } = useAuth();
  await ready;

  const isPublic = to.meta.public === true;

  if (!isPublic && !isAuthenticated.value) {
    return { path: '/login', replace: true };
  }

  // A signed-in user has no business on the landing, login or sign-up screens.
  if (isPublic && isAuthenticated.value) {
    return { path: '/tabs/home', replace: true };
  }

  return true;
});

/**
 * Reconciliation for the cached profile.
 *
 * The guard above is allowed to let a user through on a profile restored from
 * disk, so the server check happens a moment later. If that check comes back
 * saying the profile is gone - deleted account, revoked access - this is what
 * removes them from the protected screens.
 */
watch(
  () => useAuth().isAuthenticated.value,
  (authenticated) => {
    if (authenticated) return;
    if (router.currentRoute.value.meta.public === true) return;
    void router.replace('/login');
  }
);

export default router;
