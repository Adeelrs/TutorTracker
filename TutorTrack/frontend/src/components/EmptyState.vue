<template>
  <div class="empty-state">
    <strong>{{ title }}</strong>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Nothing to show yet'
  },
  message: {
    type: String,
    default: 'New activity will appear here as the platform is used.'
  }
});
</script>

