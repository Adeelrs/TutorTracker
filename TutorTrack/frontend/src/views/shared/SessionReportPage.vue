<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">{{ pageEyebrow }}</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <RouterLink :to="backLink" class="ghost-button">Back</RouterLink>
      </div>
      <p class="muted">
        Review the session setup and report in one place. Tutors and managers can edit the report here, while parents and students can read it clearly.
      </p>
    </section>

    <div v-if="feedback.message" class="notice" :class="feedback.variant === 'error' ? 'notice-error' : 'notice-success'">
      {{ feedback.message }}
    </div>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="!context"
      title="Session report not found"
      message="This session report could not be loaded right now."
    />

    <template v-else>
      <div v-if="isCancelled" class="notice notice-error">
        This session was cancelled, so the booking did not go ahead as originally planned.
      </div>

      <section class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Session information</p>
            <h3>Recorded setup and attendance</h3>
          </div>
        </div>

        <div class="detail-rows">
          <div v-for="row in detailRows" :key="row.label" class="detail-row">
            <span>{{ row.label }}</span>
            <strong class="detail-value">{{ row.value }}</strong>
          </div>
        </div>
      </section>

      <section v-if="canEdit" class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Edit report</p>
            <h3>{{ isCreateMode ? 'Create session report' : 'Update session report' }}</h3>
          </div>
        </div>

        <form class="form-grid two-column" @submit.prevent="saveReport">
          <label class="field">
            <span>Subject</span>
            <input v-model="form.topic" required />
          </label>

          <label class="field">
            <span>Exam board</span>
            <input v-model="form.examBoard" placeholder="General" />
          </label>

          <label class="field">
            <span>Attendance</span>
            <select v-model="form.attendanceStatus">
              <option value="not_present">Not present</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label class="field">
            <span>Homework / follow-up</span>
            <input v-model="form.homeworkSet" placeholder="Homework or follow-up task" />
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>What was covered</span>
            <textarea v-model="form.notes" rows="5" placeholder="Summarise what the student worked on in this session."></textarea>
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>Next steps</span>
            <textarea v-model="form.nextSteps" rows="4" placeholder="Explain the next focus for the student."></textarea>
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>Exam / assessment note</span>
            <textarea
              v-model="form.assessmentNote"
              rows="4"
              placeholder="Example: 21 Apr 2026, 18/25, 72%, algebra, next steps on rearranging equations."
            ></textarea>
          </label>

          <div class="actions-row" style="grid-column: 1 / -1;">
            <button class="primary-button" :disabled="saving">
              {{ saving ? 'Saving...' : isCreateMode ? 'Create report' : 'Save changes' }}
            </button>
            <button
              v-if="!isCreateMode"
              type="button"
              class="ghost-button"
              :disabled="deleting"
              @click="deleteReport"
            >
              {{ deleting ? 'Deleting...' : 'Delete report' }}
            </button>
          </div>
        </form>
      </section>

      <div class="split-grid detail-grid">
        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">What was covered</p>
              <h3>Session notes</h3>
            </div>
          </div>

          <div class="text-block">
            {{ context.notes || 'No session notes recorded yet.' }}
          </div>
        </section>

        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Homework / follow-up</p>
              <h3>Follow-up work</h3>
            </div>
          </div>

          <div class="text-block">
            {{ context.homework_set || 'No homework or follow-up recorded yet.' }}
          </div>
        </section>
      </div>

      <div class="split-grid detail-grid">
        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Next steps</p>
              <h3>Next teaching focus</h3>
            </div>
          </div>

          <div class="text-block">
            {{ context.next_steps || 'No next steps recorded yet.' }}
          </div>
        </section>

        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Assessment note</p>
              <h3>Exam / assessment detail</h3>
            </div>
          </div>

          <div class="text-block">
            {{ context.assessment_note || 'No assessment note recorded yet.' }}
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../services/authStore';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import EmptyState from '../../components/EmptyState.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const loadError = ref('');
const feedback = ref({ message: '', variant: 'success' });
const session = ref(null);
const booking = ref(null);

const form = reactive({
  topic: '',
  examBoard: 'General',
  attendanceStatus: 'not_present',
  notes: '',
  homeworkSet: '',
  nextSteps: '',
  assessmentNote: ''
});

const role = computed(() => auth.state.user?.role || '');
const canEdit = computed(() => ['tutor', 'manager'].includes(role.value));
const isCreateMode = computed(() => !route.params.id && Boolean(route.query.bookingId));
const context = computed(() => session.value || booking.value || null);
const isCancelled = computed(() => String(context.value?.booking_status || context.value?.status || '').toLowerCase() === 'cancelled');

const pageEyebrow = computed(() => {
  if (role.value === 'tutor') return 'Tutor session report';
  if (role.value === 'parent') return 'Parent session report';
  if (role.value === 'manager') return 'Manager session report';
  return 'Student session report';
});

const pageTitle = computed(() => context.value?.topic || context.value?.subject || 'Session report');

const backLink = computed(() => {
  if (role.value === 'tutor') {
    if (route.query.studentUserId) {
      return `/app/tutor/students/${route.query.studentUserId}`;
    }

    return '/app/tutor/dashboard';
  }

  if (role.value === 'parent') {
    return {
      path: '/app/parent/dashboard',
      query: route.query.studentUserId ? { studentUserId: route.query.studentUserId } : {}
    };
  }

  if (role.value === 'manager') {
    if (route.query.userId) {
      return `/app/manager/users/${route.query.userId}`;
    }

    return '/app/manager/dashboard';
  }

  return '/app/student/dashboard';
});

const detailRows = computed(() => [
  { label: 'Date and time', value: formatDateTime(context.value?.session_date || buildBookingDateTime(context.value)) },
  { label: 'Student ID', value: context.value?.student_platform_user_id || 'Not assigned' },
  { label: 'Student name', value: context.value?.student_name || 'Student' },
  { label: 'Subject', value: context.value?.topic || context.value?.subject || 'General' },
  { label: 'Exam board', value: context.value?.exam_board || context.value?.examBoard || 'General' },
  { label: 'Tutor', value: context.value?.tutor_name || 'TutorTrack tutor' },
  { label: 'Parent name', value: context.value?.parent_name || 'No linked parent' },
  { label: 'Parent phone number', value: context.value?.parent_phone_number || 'No phone number provided' },
  { label: 'Duration', value: context.value?.duration_minutes ? `${context.value.duration_minutes} mins` : 'Not recorded' },
  { label: 'Attendance', value: attendanceLabel(context.value?.attendance_status) },
  { label: 'Status', value: statusLabel(context.value) }
]);

const syncForm = () => {
  if (!context.value) {
    return;
  }

  form.topic = context.value.topic || context.value.subject || '';
  form.examBoard = context.value.exam_board || context.value.examBoard || 'General';
  form.attendanceStatus = context.value.attendance_status || 'not_present';
  form.notes = context.value.notes || '';
  form.homeworkSet = context.value.homework_set || '';
  form.nextSteps = context.value.next_steps || '';
  form.assessmentNote = context.value.assessment_note || '';
};

const loadPage = async () => {
  loading.value = true;
  loadError.value = '';
  feedback.value = { message: '', variant: 'success' };

  try {
    if (route.params.id) {
      const response = await api.get(`/sessions/${route.params.id}`);
      session.value = response.data.data || null;
      booking.value = null;
    } else if (route.query.bookingId) {
      const response = await api.get(`/bookings/${route.query.bookingId}`);
      booking.value = response.data.data || null;
      session.value = null;
    } else {
      session.value = null;
      booking.value = null;
    }

    syncForm();
  } catch (error) {
    session.value = null;
    booking.value = null;
    loadError.value = error.response?.data?.message || 'Session report could not be loaded right now.';
  } finally {
    loading.value = false;
  }
};

const saveReport = async () => {
  if (!canEdit.value || !context.value) {
    return;
  }

  saving.value = true;
  feedback.value = { message: '', variant: 'success' };

  const payload = {
    tutorUserId: role.value === 'manager' ? context.value.tutor_user_id : undefined,
    studentUserId: context.value.student_user_id,
    bookingId: isCreateMode.value ? context.value.id : context.value.booking_id || undefined,
    topic: form.topic,
    examBoard: form.examBoard || 'General',
    sessionDate: buildSessionDateTimeValue(context.value),
    durationMinutes: context.value.duration_minutes,
    attendanceStatus: form.attendanceStatus,
    notes: form.notes,
    homeworkSet: form.homeworkSet,
    nextSteps: form.nextSteps,
    assessmentNote: form.assessmentNote
  };

  try {
    if (isCreateMode.value) {
      const response = await api.post('/sessions', payload);
      feedback.value = { message: 'Session report created successfully.', variant: 'success' };
      await router.replace(buildExistingSessionRoute(response.data.data.id));
    } else {
      await api.put(`/sessions/${route.params.id}`, payload);
      feedback.value = { message: 'Session report updated successfully.', variant: 'success' };
      await loadPage();
    }
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Session report could not be saved.',
      variant: 'error'
    };
  } finally {
    saving.value = false;
  }
};

const deleteReport = async () => {
  if (!canEdit.value || isCreateMode.value || !route.params.id) {
    return;
  }

  deleting.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.delete(`/sessions/${route.params.id}`);
    await router.push(backLink.value);
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Session report could not be deleted.',
      variant: 'error'
    };
  } finally {
    deleting.value = false;
  }
};

watch(
  () => [route.params.id, route.query.bookingId].join(':'),
  () => {
    loadPage();
  }
);

onMounted(loadPage);

function buildBookingDateTime(value) {
  const datePart = normaliseDatePart(value?.booking_date);
  const timePart = normaliseTimePart(value?.start_time);

  if (!datePart || !timePart) {
    return '';
  }

  return `${datePart} ${timePart}:00`;
}

function buildSessionDateTimeValue(value) {
  if (!value) {
    return '';
  }

  if (value.session_date) {
    return normaliseExistingSessionDateTime(value.session_date);
  }

  return buildBookingDateTime(value);
}

function buildExistingSessionRoute(sessionId) {
  if (role.value === 'tutor') {
    return {
      path: `/app/tutor/sessions/${sessionId}`,
      query: route.query.studentUserId ? { studentUserId: route.query.studentUserId } : {}
    };
  }

  if (role.value === 'manager') {
    return {
      path: `/app/manager/sessions/${sessionId}`,
      query: route.query.userId ? { userId: route.query.userId } : {}
    };
  }

  return `/app/student/sessions/${sessionId}`;
}

function formatDateTime(value) {
  if (!value) {
    return 'No date recorded';
  }

  const parsed = parseDateTimeValue(value);

  if (!parsed) {
    return 'No date recorded';
  }

  return parsed.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseDateTimeValue(value) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    const parsed = new Date(text.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseExistingSessionDateTime(value) {
  const parsed = parseDateTimeValue(value);

  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
}

function normaliseDatePart(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = parseDateTimeValue(text);

  if (!parsed) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normaliseTimePart(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return text.slice(0, 5);
  }

  const parsed = parseDateTimeValue(text);

  if (!parsed) {
    return '';
  }

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function attendanceLabel(status) {
  if (!status) {
    return 'Not marked';
  }

  if (status === 'not_present') {
    return 'Not present';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusLabel(value) {
  if (!value) {
    return 'Not recorded';
  }

  if (String(value.booking_status || value.status || '').toLowerCase() === 'cancelled') {
    return 'Cancelled';
  }

  return route.params.id ? 'Reported' : 'Planned booking';
}
</script>

<style scoped>
.detail-grid {
  align-items: start;
}

.detail-rows {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.detail-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detail-row span {
  min-width: 180px;
  color: var(--muted);
}

.detail-value {
  color: var(--heading);
  text-align: right;
  line-height: 1.5;
  max-width: 65%;
  word-break: break-word;
}

.text-block {
  min-height: 120px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
  white-space: pre-wrap;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .detail-row {
    display: grid;
    gap: 4px;
  }

  .detail-value {
    max-width: 100%;
    text-align: left;
  }
}
</style>
