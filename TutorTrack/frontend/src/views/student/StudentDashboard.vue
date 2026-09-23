<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Student dashboard</p>
          <h2>Your learning overview</h2>
        </div>
      </div>
      <p class="muted">
        Use this page as your main student details view: profile, guardians, subjects, and recorded session reports in one place.
      </p>
    </section>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="!dashboard.student"
      title="Student profile not found"
      message="Your student dashboard could not be loaded right now."
    />

    <StudentSessionOverview
      v-else
      :dashboard-data="dashboard"
      :sessions="sessions"
      session-base-path="/app/student/sessions"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import EmptyState from '../../components/EmptyState.vue';
import StudentSessionOverview from '../../components/StudentSessionOverview.vue';

const loading = ref(true);
const loadError = ref('');
const dashboard = ref({});
const sessions = ref([]);

const loadPage = async () => {
  loading.value = true;
  loadError.value = '';

  const [dashboardResult, sessionsResult] = await Promise.allSettled([
    api.get('/students/dashboard'),
    api.get('/sessions')
  ]);

  const failures = [];

  if (dashboardResult.status === 'fulfilled') {
    dashboard.value = dashboardResult.value.data.data || {};
  } else {
    dashboard.value = {};
    failures.push(dashboardResult.reason?.response?.data?.message || 'Student dashboard could not be loaded right now.');
  }

  if (sessionsResult.status === 'fulfilled') {
    sessions.value = Array.isArray(sessionsResult.value.data.data) ? sessionsResult.value.data.data : [];
  } else {
    sessions.value = [];
    failures.push(sessionsResult.reason?.response?.data?.message || 'Session reports could not be loaded right now.');
  }

  if (failures.length) {
    loadError.value = failures[0];
  }

  loading.value = false;
};

onMounted(loadPage);
</script>
