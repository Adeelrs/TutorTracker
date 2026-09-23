<template>
  <section class="panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Bookings</p>
        <h3>{{ title }}</h3>
      </div>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>

    <EmptyState
      v-if="!bookings?.length"
      title="No bookings yet"
      message="Once bookings are requested or approved they will show up here."
    />

    <div v-else class="table-wrap table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Tutor</th>
            <th>Student</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Notes</th>
            <th v-if="editable || hasBookingActionSlot">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="booking in bookings" :key="booking.id">
            <td>{{ formatDate(booking.booking_date) }}</td>
            <td>{{ formatTime(booking.start_time) }}</td>
            <td>{{ booking.tutor_name || '-' }}</td>
            <td>{{ booking.student_name || '-' }}</td>
            <td>{{ booking.subject || 'General' }}</td>
            <td><UserBadge :text="booking.status" :variant="variant(booking.status)" /></td>
            <td>{{ booking.notes || 'No booking note.' }}</td>
            <td v-if="editable || hasBookingActionSlot">
              <div class="actions-row">
                <template v-if="editable">
                  <button class="primary-button" @click="$emit('status-change', booking.id, 'confirmed')">Confirm</button>
                  <button class="secondary-button" @click="$emit('status-change', booking.id, 'completed')">Complete</button>
                  <button class="ghost-button" @click="$emit('status-change', booking.id, 'cancelled')">Cancel</button>
                </template>
                <slot v-else name="booking-action" :booking="booking" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, useSlots } from 'vue';
import EmptyState from './EmptyState.vue';
import UserBadge from './UserBadge.vue';

const slots = useSlots();
const hasBookingActionSlot = computed(() => Boolean(slots['booking-action']));

defineProps({
  bookings: {
    type: Array,
    default: () => []
  },
  editable: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Scheduled and requested sessions'
  },
  subtitle: {
    type: String,
    default: 'Booking status is visible across tutor, student, parent, and manager portals.'
  }
});

defineEmits(['status-change']);

const formatDate = (value) => {
  if (!value) return 'No date';

  const dateValue = parseDateValue(value);

  if (!dateValue) {
    return 'No date';
  }

  return dateValue.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (value) => {
  if (!value) return 'No time';
  return new Date(`2000-01-01T${String(value).slice(0, 5)}:00`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const variant = (status) => {
  if (status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
};

const parseDateValue = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalised = text.includes('T') ? text : text.replace(' ', 'T');
  const parsed = new Date(normalised);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
</script>
