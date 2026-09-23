<template>
  <div class="auth-shell">
    <section class="auth-hero">
      <div>
        <p class="eyebrow">Create account</p>
        <h1>Join TutorTrack</h1>
        <p style="max-width: 520px; margin-top: 16px;">
          Create a parent or tutor account using a simple signup form.
        </p>
      </div>
    </section>

    <section style="display: flex;">
      <article class="panel auth-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Register</p>
            <h2>Create your account</h2>
          </div>
        </div>

        <form class="form-grid two-column" @submit.prevent="handleRegister">
          <label class="field" style="grid-column: 1 / -1;">
            <span>Account type</span>
            <select v-model="form.role" required>
              <option value="parent">Parent</option>
              <option value="tutor">Tutor</option>
            </select>
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>Full name</span>
            <input
              v-model="form.fullName"
              maxlength="80"
              placeholder="First and last name"
              required
            />
          </label>

          <label class="field">
            <span>Email</span>
            <input
              v-model="form.email"
              type="email"
              maxlength="254"
              placeholder="name@example.com"
              required
            />
          </label>

          <label class="field">
            <span>Phone number</span>
            <input
              v-model="form.phoneNumber"
              inputmode="numeric"
              maxlength="11"
              placeholder="11-digit phone number"
              required
              @input="normalisePhoneNumber"
            />
          </label>

          <label class="field">
            <span>Password</span>
            <input
              v-model="form.password"
              type="password"
              minlength="8"
              maxlength="64"
              required
            />
          </label>

          <label class="field">
            <span>Confirm password</span>
            <input
              v-model="form.confirmPassword"
              type="password"
              minlength="8"
              maxlength="64"
              required
            />
          </label>

          <div v-if="error" class="notice notice-error" style="grid-column: 1 / -1;">
            <strong>{{ error }}</strong>
          </div>

          <div class="actions-row" style="grid-column: 1 / -1;">
            <button class="primary-button" :disabled="loading">
              {{ loading ? 'Creating account...' : 'Create account' }}
            </button>
            <RouterLink class="ghost-button" to="/login">Back to login</RouterLink>
          </div>
        </form>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../services/authStore';

const router = useRouter();
const { register } = useAuthStore();

const loading = ref(false);
const error = ref('');

const form = reactive({
  role: 'parent',
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: ''
});

const passwordsDoNotMatch = computed(
  () => Boolean(form.confirmPassword) && form.password !== form.confirmPassword
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Za-z]+(?:[A-Za-z' -]*[A-Za-z])$/;
const passwordStrengthPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const roleHome = {
  tutor: '/app/tutor/dashboard',
  parent: '/app/parent/dashboard'
};

const normalisePhoneNumber = () => {
  form.phoneNumber = String(form.phoneNumber || '').replace(/\D/g, '').slice(0, 11);
};

const validateForm = () => {
  const role = String(form.role || '').trim();
  const fullName = String(form.fullName || '').trim().replace(/\s+/g, ' ');
  const email = String(form.email || '').trim().toLowerCase();
  const phoneNumber = String(form.phoneNumber || '').trim();
  const password = String(form.password || '');

  form.fullName = fullName;
  form.email = email;

  if (!['parent', 'tutor'].includes(role)) {
    return 'Please choose a valid account type.';
  }

  if (!fullName) {
    return 'Full name is required.';
  }

  if (fullName.length < 2 || fullName.length > 80) {
    return 'Full name must be between 2 and 80 characters.';
  }

  if (!namePattern.test(fullName)) {
    return 'Full name can only use letters, spaces, apostrophes, and hyphens.';
  }

  if (!email) {
    return 'Email is required.';
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return 'Please enter a valid email address.';
  }

  if (phoneNumber.length !== 11) {
    return 'Phone number must contain exactly 11 digits.';
  }

  if (password.length < 8 || password.length > 64) {
    return 'Password must be between 8 and 64 characters.';
  }

  if (!passwordStrengthPattern.test(password)) {
    return 'Password must include an uppercase letter, a lowercase letter, a number, and a special character.';
  }

  if (passwordsDoNotMatch.value) {
    return 'Password and confirm password must match.';
  }

  return '';
};

const handleRegister = async () => {
  loading.value = true;
  error.value = '';

  normalisePhoneNumber();
  const validationError = validateForm();

  if (validationError) {
    error.value = validationError;
    loading.value = false;
    return;
  }

  try {
    const session = await register({
      role: form.role,
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      password: form.password
    });

    router.push(roleHome[session.user.role] || '/app/profile');
  } catch (err) {
    error.value = err.response?.data?.message || 'Unable to create account right now.';
  } finally {
    loading.value = false;
  }
};
</script>
