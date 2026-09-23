<template>
  <div class="table-wrap table-scroll">
    <table class="data-table">
      <thead>
        <tr>
          <th>Platform ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Email</th>
          <th>Profile highlight</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id" class="clickable-row" @click="$emit('select', user.id)">
          <td>{{ user.platform_user_id }}</td>
          <td>{{ user.full_name }}</td>
          <td><UserBadge :text="user.role" /></td>
          <td>{{ user.email }}</td>
          <td>{{ user.specialism || user.subject_focus || user.phone_number || user.phone || user.title || '-' }}</td>
          <td>
            <UserBadge
              :text="user.display_status || user.approval_status || user.account_status"
              :variant="variant(user.display_status || user.approval_status || user.account_status)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import UserBadge from './UserBadge.vue';

defineProps({
  users: {
    type: Array,
    default: () => []
  }
});

defineEmits(['select']);

const variant = (value) => {
  if (value === 'approved' || value === 'active') return 'success';
  if (value === 'pending') return 'warning';
  if (value === 'rejected' || value === 'inactive') return 'danger';
  return 'default';
};
</script>
