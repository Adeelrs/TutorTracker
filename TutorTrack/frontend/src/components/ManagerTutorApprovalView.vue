<template>
  <section class="panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Tutor approval</p>
        <h3>Approval queue</h3>
      </div>
      <p>Managers decide which tutors can use the live teaching tools.</p>
    </div>

    <EmptyState
      v-if="!tutors?.length"
      title="No tutors available"
      message="New tutor registrations will appear here for review."
    />

    <div v-else class="stack list-scroll">
      <article v-for="tutor in tutors" :key="tutor.id" class="card">
        <div class="section-header">
          <div>
            <h4>{{ tutor.full_name }}</h4>
            <p class="muted">{{ tutor.email }} | {{ tutor.specialism || 'Specialism not supplied' }}</p>
          </div>
          <UserBadge :text="tutor.approval_status" :variant="variant(tutor.approval_status)" />
        </div>

        <div class="stack">
          <p class="muted">{{ tutor.bio || 'No biography supplied.' }}</p>
          <p class="helper-text">Stages: {{ (tutor.stages_taught || []).join(', ') || 'Not supplied' }}</p>
          <p class="helper-text">Subjects: {{ (tutor.subjects_taught || []).join(', ') || 'Not supplied' }}</p>
          <p class="helper-text">Exam boards: {{ (tutor.exam_boards_taught || []).join(', ') || 'Not supplied' }}</p>
        </div>

        <div class="actions-row" style="margin-top: 14px;">
          <button class="primary-button" @click="$emit('update', tutor.id, 'approved')">Approve</button>
          <button class="ghost-button" @click="$emit('update', tutor.id, 'rejected')">Reject</button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import EmptyState from './EmptyState.vue';
import UserBadge from './UserBadge.vue';

defineProps({
  tutors: {
    type: Array,
    default: () => []
  }
});

defineEmits(['update']);

const variant = (value) => {
  if (value === 'approved') return 'success';
  if (value === 'pending') return 'warning';
  if (value === 'rejected') return 'danger';
  return 'default';
};
</script>
