<template>
  <div class="auth-shell">
    <section class="auth-hero">
      <div>
        <p class="eyebrow">TutorTrack</p>
        <h1>Shared session evidence. Clear accountability.</h1>
        <p style="max-width: 520px; margin-top: 16px;">
          TutorTrack gives tutors, students, parents, and managers one clear place for bookings,
          session reports, role-based oversight, and communication.
        </p>
      </div>
    </section>

    <section style="display: flex;">
      <article class="panel auth-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Sign in</p>
            <h2>Access your portal</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="handleLogin">
          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" required />
          </label>

          <label class="field">
            <span>Password</span>
            <input v-model="form.password" type="password" required />
          </label>

          <div v-if="error" class="notice notice-error">
            <strong>Login unavailable</strong>
            <p class="muted" style="margin-top: 6px; color: var(--danger);">{{ error }}</p>
          </div>

          <div class="actions-row">
            <button class="primary-button" :disabled="loading">{{ loading ? 'Signing in...' : 'Login' }}</button>
            <RouterLink class="ghost-button" to="/register">Create account</RouterLink>
          </div>
        </form>
      </article>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../services/authStore';

const router = useRouter();
const { login } = useAuthStore();

const form = reactive({
  email: '',
  password: ''
});

const loading = ref(false);
const error = ref('');

const roleHome = {
  tutor: '/app/tutor/dashboard',
  student: '/app/student/dashboard',
  parent: '/app/parent/dashboard',
  manager: '/app/manager/dashboard'
};

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const session = await login(form);
    router.push(roleHome[session.user.role] || '/login');
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to sign in right now.';
  } finally {
    loading.value = false;
  }
};
</script>
