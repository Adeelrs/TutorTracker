<template>
  <section class="panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Bookings</p>
        <h3>{{ title }}</h3>
      </div>
      <p>Create a clear session request with a tutor, subject, date, time, and note.</p>
    </div>

    <form class="form-grid two-column" @submit.prevent="handleSubmit">
      <label class="field">
        <span>Tutor</span>
        <select v-model="form.tutorUserId" required>
          <option value="">Select tutor</option>
          <option v-for="tutor in tutors" :key="tutor.id" :value="String(tutor.id)">
            {{ tutor.full_name }} - {{ tutor.specialism || 'General' }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Student</span>
        <select v-model="form.studentUserId" required>
          <option value="">Select student</option>
          <option v-for="student in students" :key="student.id" :value="String(student.id)">
            {{ student.full_name }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Subject</span>
        <select v-model="form.subject" required>
          <option value="">Select subject</option>
          <option v-for="subject in subjects" :key="subject" :value="subject">{{ subject }}</option>
        </select>
      </label>

      <label class="field">
        <span>Exam board</span>
        <select v-model="form.examBoard">
          <option value="">General</option>
          <option value="AQA">AQA</option>
          <option value="OCR">OCR</option>
          <option value="Pearson Edexcel">Pearson Edexcel</option>
          <option value="WJEC Eduqas">WJEC Eduqas</option>
        </select>
      </label>

      <label class="field">
        <span>Date</span>
        <input v-model="form.bookingDate" type="date" required />
      </label>

      <label class="field">
        <span>Start time</span>
        <input v-model="form.startTime" type="time" required />
      </label>

      <label class="field">
        <span>Duration (minutes)</span>
        <input v-model.number="form.durationMinutes" type="number" min="30" step="15" required />
      </label>

      <label class="field">
        <span>Note</span>
        <input v-model="form.notes" placeholder="Optional note for the tutor" />
      </label>

      <div class="actions-row" style="grid-column: 1 / -1;">
        <button class="primary-button" :disabled="submitting">
          {{ submitting ? 'Saving...' : 'Request booking' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  tutors: {
    type: Array,
    default: () => []
  },
  students: {
    type: Array,
    default: () => []
  },
  submitting: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Create a booking'
  },
  initialStudentUserId: {
    type: [String, Number],
    default: ''
  }
});

const emit = defineEmits(['submit']);

const form = reactive({
  tutorUserId: '',
  studentUserId: props.initialStudentUserId ? String(props.initialStudentUserId) : '',
  subject: '',
  examBoard: '',
  bookingDate: '',
  startTime: '',
  durationMinutes: 60,
  notes: ''
});

watch(
  () => props.initialStudentUserId,
  (value) => {
    form.studentUserId = value ? String(value) : '';
  }
);

const handleSubmit = () => {
  emit('submit', {
    ...form,
    examBoard: form.examBoard || 'General'
  });
};

const subjects = [
  'Mathematics',
  'English Language',
  'English Literature',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'History',
  'Geography',
  'Computer Science',
  'Business',
  'Economics',
  'Psychology'
];
</script>
