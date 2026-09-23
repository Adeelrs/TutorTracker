<template>
  <div class="loading-state">
    <strong>Loading data...</strong>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: 'Please wait while TutorTrack fetches the latest information.'
  }
});
</script>

