<template>
  <section class="panel" style="margin: 40px auto; max-width: 720px;">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p class="muted" style="margin-top: 10px;">
      The page you tried to open is not part of the TutorTrack demo flow.
    </p>
    <div class="actions-row" style="margin-top: 18px;">
      <RouterLink class="primary-button" to="/login">Return to login</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>
