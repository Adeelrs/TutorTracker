<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Bookings</p>
          <h3>Create a booking request</h3>
        </div>
      </div>

      <BookingForm
        title="Request a session for a linked child"
        :tutors="tutors"
        :students="linkedChildren"
        :submitting="bookingSaving"
        :initial-student-user-id="selectedStudentId"
        @submit="$emit('create-booking', $event)"
      />
    </section>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Linked children</p>
          <h3>{{ linkedChildren.length }} child{{ linkedChildren.length === 1 ? '' : 'ren' }}</h3>
        </div>
      </div>

      <EmptyState
        v-if="!linkedChildren.length"
        title="No linked children"
        message="Linked child records will appear here once they are connected to this guardian account."
      />

      <div v-else class="child-card-grid">
        <button
          v-for="child in linkedChildren"
          :key="child.id"
          type="button"
          class="card child-card"
          :class="{ active: Number(selectedStudentId) === Number(child.id) }"
          @click="$emit('select-child', child.id)"
        >
          <strong>{{ child.full_name }}</strong>
          <span class="helper-text">{{ child.platform_user_id || 'No student ID' }}</span>
          <span class="muted">{{ child.year_group || 'Year group not set' }}</span>
          <span class="muted">{{ child.subject_focus || 'Subject focus not set' }}</span>
        </button>
      </div>
    </section>

    <BookingsView
      :bookings="selectedBookings"
      title="Bookings for selected child"
    >
      <template #booking-action="{ booking }">
        <button
          v-if="shouldMessageTutorForBooking(booking)"
          type="button"
          class="ghost-button compact-button"
          @click="$emit('message-tutor', booking)"
        >
          Message tutor
        </button>
        <button
          v-else-if="getReportForBooking(booking)"
          type="button"
          class="secondary-button compact-button"
          @click="$emit('view-booking-report', booking)"
        >
          View report
        </button>
        <button
          v-else
          type="button"
          class="ghost-button compact-button"
          @click="$emit('request-booking-report', booking)"
        >
          Request report
        </button>
      </template>
    </BookingsView>

    <StudentSessionOverview
      v-if="selectedDashboard.student"
      :dashboard-data="selectedDashboard"
      :sessions="selectedSessions"
      :session-base-path="sessionBasePath"
      :route-query="sessionRouteQuery"
      :force-hard-navigation="forceHardNavigation"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import EmptyState from './EmptyState.vue';
import StudentSessionOverview from './StudentSessionOverview.vue';
import BookingForm from './BookingForm.vue';
import BookingsView from './BookingsView.vue';

const props = defineProps({
  linkedChildren: {
    type: Array,
    default: () => []
  },
  tutors: {
    type: Array,
    default: () => []
  },
  selectedStudentId: {
    type: [String, Number, null],
    default: null
  },
  selectedBookings: {
    type: Array,
    default: () => []
  },
  selectedDashboard: {
    type: Object,
    default: () => ({})
  },
  selectedSessions: {
    type: Array,
    default: () => []
  },
  bookingSaving: {
    type: Boolean,
    default: false
  },
  sessionBasePath: {
    type: String,
    required: true
  },
  sessionRouteQuery: {
    type: Object,
    default: () => ({})
  },
  forceHardNavigation: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'create-booking',
  'select-child',
  'view-booking-report',
  'request-booking-report',
  'message-tutor'
]);

const reportedSessionsByBookingId = computed(() =>
  new Map(
    props.selectedSessions
      .filter((session) => Number(session.booking_id))
      .map((session) => [Number(session.booking_id), session])
  )
);

const getReportForBooking = (booking) => reportedSessionsByBookingId.value.get(Number(booking.id)) || null;

const shouldMessageTutorForBooking = (booking) => {
  const status = String(booking.status || '').toLowerCase();
  return ['cancelled', 'rejected'].includes(status);
};
</script>

<style scoped>
.child-card-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.child-card {
  display: grid;
  gap: 6px;
  text-align: left;
  color: var(--ink);
  transition: 0.2s ease;
}

.child-card:hover {
  background: var(--surface-subtle);
  border-color: rgba(22, 91, 109, 0.2);
}

.child-card.active {
  border-color: rgba(22, 91, 109, 0.32);
  box-shadow: inset 0 0 0 1px rgba(22, 91, 109, 0.24);
  background: var(--primary-soft);
}
</style>
