<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Tutor student</p>
          <h2>{{ dashboard.student?.full_name || 'Student profile' }}</h2>
        </div>
        <RouterLink to="/app/tutor/dashboard" class="ghost-button">Back to dashboard</RouterLink>
      </div>
      <p class="muted">
        Review this student’s details, linked guardians, subjects, and recorded session reports from one tutor-facing student page.
      </p>
    </section>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="!dashboard.student"
      title="Student not found"
      message="This student could not be loaded for the tutor view."
    />

    <StudentSessionOverview
      v-else
      :dashboard-data="dashboard"
      :sessions="sessions"
      session-base-path="/app/tutor/sessions"
      :route-query="{ studentUserId: String(route.params.id) }"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import EmptyState from '../../components/EmptyState.vue';
import StudentSessionOverview from '../../components/StudentSessionOverview.vue';

const route = useRoute();
const loading = ref(true);
const loadError = ref('');
const dashboard = ref({});
const sessions = ref([]);

const loadPage = async () => {
  loading.value = true;
  loadError.value = '';

  const [dashboardResult, sessionsResult] = await Promise.allSettled([
    api.get('/students/dashboard', { params: { studentUserId: route.params.id } }),
    api.get('/sessions', { params: { studentUserId: route.params.id } })
  ]);

  const failures = [];

  if (dashboardResult.status === 'fulfilled') {
    dashboard.value = dashboardResult.value.data.data || {};
  } else {
    dashboard.value = {};
    failures.push(dashboardResult.reason?.response?.data?.message || 'Student detail could not be loaded right now.');
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

watch(
  () => route.params.id,
  () => {
    loadPage();
  }
);

onMounted(loadPage);
</script>
