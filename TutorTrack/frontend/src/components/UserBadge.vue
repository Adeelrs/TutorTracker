<template>
  <span class="badge" :class="variantClass">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  text: String,
  variant: {
    type: String,
    default: 'default'
  }
});

const variantClass = computed(() => {
  if (props.variant === 'success') return 'success';
  if (props.variant === 'warning') return 'warning';
  if (props.variant === 'danger') return 'danger';
  return '';
});
</script>

