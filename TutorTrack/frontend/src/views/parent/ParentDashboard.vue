<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Parent dashboard</p>
          <h2>Bookings and child overview</h2>
        </div>
      </div>
      <p class="muted">
        Request bookings at the top, then open each linked child’s learning overview from the same dashboard.
      </p>
    </section>

    <div v-if="feedback.message" class="notice" :class="feedback.variant === 'error' ? 'notice-error' : 'notice-success'">
      {{ feedback.message }}
    </div>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <template v-else>
      <ParentDashboardContent
        :linked-children="children"
        :tutors="tutors"
        :selected-student-id="selectedStudentId"
        :selected-bookings="selectedBookings"
        :selected-dashboard="selectedDashboard"
        :selected-sessions="selectedSessions"
        :booking-saving="bookingSaving"
        session-base-path="/app/parent/sessions"
        :session-route-query="selectedStudentId ? { studentUserId: String(selectedStudentId) } : {}"
        @create-booking="createBooking"
        @select-child="selectChild"
        @view-booking-report="viewBookingReport"
        @request-booking-report="requestBookingReport"
        @message-tutor="messageTutorAboutBooking"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import ParentDashboardContent from '../../components/ParentDashboardContent.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const loadError = ref('');
const bookingSaving = ref(false);
const feedback = ref({ message: '', variant: 'success' });
const children = ref([]);
const tutors = ref([]);
const allBookings = ref([]);
const selectedDashboard = ref({});
const selectedSessions = ref([]);

const selectedStudentId = computed(() => {
  const routeValue = String(route.query.studentUserId || '').trim();
  if (routeValue && children.value.some((child) => String(child.id) === routeValue)) {
    return Number(routeValue);
  }

  return children.value[0]?.id || null;
});

const selectedBookings = computed(() =>
  allBookings.value
    .filter((booking) => Number(booking.student_user_id) === Number(selectedStudentId.value))
    .sort((left, right) => buildBookingTimestamp(right) - buildBookingTimestamp(left))
);

const loadChildren = async () => {
  const response = await api.get('/students');
  children.value = response.data.data || [];
};

const loadSelectedStudent = async () => {
  if (!selectedStudentId.value) {
    selectedDashboard.value = {};
    selectedSessions.value = [];
    return;
  }

  const [dashboardResponse, sessionsResponse] = await Promise.all([
    api.get('/students/dashboard', { params: { studentUserId: selectedStudentId.value } }),
    api.get('/sessions', { params: { studentUserId: selectedStudentId.value } })
  ]);

  selectedDashboard.value = dashboardResponse.data.data || {};
  selectedSessions.value = sessionsResponse.data.data || [];
};

const loadBookingData = async () => {
  const [tutorsResponse, bookingsResponse] = await Promise.all([
    api.get('/tutors'),
    api.get('/bookings')
  ]);

  tutors.value = tutorsResponse.data.data || [];
  allBookings.value = bookingsResponse.data.data || [];
};

const loadPage = async () => {
  loading.value = true;
  loadError.value = '';

  try {
    await loadChildren();

    if (!route.query.studentUserId && children.value[0]?.id) {
      await router.replace({
        query: {
          ...route.query,
          studentUserId: String(children.value[0].id)
        }
      });
    }

    await Promise.all([loadSelectedStudent(), loadBookingData()]);
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Parent dashboard could not be loaded right now.';
  } finally {
    loading.value = false;
  }
};

const selectChild = async (studentUserId) => {
  await router.replace({
    query: {
      ...route.query,
      studentUserId: String(studentUserId)
    }
  });
};

const createBooking = async (payload) => {
  bookingSaving.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/bookings', payload);
    feedback.value = { message: 'Booking requested successfully.', variant: 'success' };
    await loadBookingData();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Booking could not be created right now.',
      variant: 'error'
    };
  } finally {
    bookingSaving.value = false;
  }
};

const viewBookingReport = (booking) => {
  const report = selectedSessions.value.find((session) => Number(session.booking_id) === Number(booking.id));

  if (!report) {
    return;
  }

  router.push({
    path: `/app/parent/sessions/${report.id}`,
    query: selectedStudentId.value ? { studentUserId: String(selectedStudentId.value) } : {}
  });
};

const requestBookingReport = async (booking) => {
  await router.push({
    path: '/app/parent/messages',
    query: {
      recipientUserId: String(booking.tutor_user_id || ''),
      studentUserId: selectedStudentId.value ? String(selectedStudentId.value) : '',
      subject: `Session report request: ${booking.subject || 'Tutoring session'}`
    }
  });
};

const messageTutorAboutBooking = async (booking) => {
  await router.push({
    path: '/app/parent/messages',
    query: {
      recipientUserId: String(booking.tutor_user_id || ''),
      studentUserId: selectedStudentId.value ? String(selectedStudentId.value) : '',
      subject: `Booking follow-up: ${booking.subject || 'Tutoring session'}`
    }
  });
};

watch(
  () => route.query.studentUserId,
  () => {
    loadSelectedStudent();
  }
);

onMounted(loadPage);

function buildBookingTimestamp(booking) {
  const datePart = normaliseBookingDatePart(booking.booking_date);
  const timePart = String(booking.start_time || '').slice(0, 5);

  if (!datePart || !timePart) {
    return Number.NaN;
  }

  return new Date(`${datePart}T${timePart}:00`).getTime();
}

function normaliseBookingDatePart(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (text.includes('T')) {
    return text.slice(0, 10);
  }

  const parsed = new Date(text.replace(' ', 'T'));

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
</script>

<style scoped>
</style>
