<template>
  <div class="shell">
    <header class="shell-header">
      <div class="topbar shell-topbar">
        <div class="topbar-brand">
          <p class="eyebrow">TutorTrack</p>
          <h1>Evidence-led tutoring</h1>
        </div>

        <div class="topbar-actions">
          <div ref="avatarMenuRef" class="avatar-menu">
            <button class="avatar-button" @click="toggleMenu">
              {{ initials }}
            </button>

            <div v-if="menuOpen" class="avatar-dropdown card">
              <div class="avatar-dropdown-section">
                <span class="eyebrow">Username</span>
                <strong>{{ state.user?.email || state.user?.full_name || 'TutorTrack user' }}</strong>
              </div>
              <div class="avatar-dropdown-section">
                <span class="eyebrow">User ID</span>
                <span>{{ state.user?.platform_user_id || 'Not assigned' }}</span>
              </div>
              <div class="avatar-dropdown-section">
                <span class="eyebrow">Theme toggle</span>
                <button class="dropdown-link dropdown-button" type="button" @click="preferences.toggleTheme()">
                  {{ preferences.isDarkMode.value ? 'Switch to light mode' : 'Switch to dark mode' }}
                </button>
              </div>
              <div class="avatar-dropdown-links">
                <RouterLink to="/app/profile" custom v-slot="{ href, navigate }">
                  <a
                    :href="href"
                    class="dropdown-link"
                    @click="handleAppNavigation($event, '/app/profile', navigate)"
                  >
                    Profile
                  </a>
                </RouterLink>
                <button class="dropdown-link dropdown-button" @click="handleLogout">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav class="shell-nav" aria-label="Primary navigation">
        <div class="top-nav">
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            custom
            v-slot="{ href, navigate, isActive }"
          >
            <a
              :href="href"
              class="top-nav-link"
              :class="{ 'router-link-active': isActive }"
              @click="handleAppNavigation($event, item.to, navigate)"
            >
              {{ item.label }}
            </a>
          </RouterLink>
        </div>
      </nav>
    </header>

    <main class="shell-main">
      <section class="page-section">
        <router-view :key="route.fullPath" />
      </section>
    </main>
  </div>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { RouterLink, useRoute, useRouter } from 'vue-router';
  import { useAuthStore } from '../services/authStore';
  import { useRoleNavigation } from '../composables/useRoleNavigation';
  import { usePreferencesStore } from '../services/preferencesStore';

  const router = useRouter();
  const route = useRoute();
  const auth = useAuthStore();
  const preferences = usePreferencesStore();
  const { state } = auth;
  const navigation = computed(() => useRoleNavigation(state.user?.role));
  const menuOpen = ref(false);
  const avatarMenuRef = ref(null);
  const shouldForceHardNavigation = computed(() =>
    state.user?.role === 'manager' && route.path.startsWith('/app/manager/users/')
  );

  const initials = computed(() =>
    (state.user?.full_name || 'TT')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  );

  const closeMenu = () => {
    menuOpen.value = false;
  };

  const toggleMenu = () => {
    menuOpen.value = !menuOpen.value;
  };

  const handleDocumentClick = (event) => {
    if (!avatarMenuRef.value?.contains(event.target)) {
      closeMenu();
    }
  };

  const handleLogout = async () => {
    closeMenu();
    await auth.logout();
    router.push('/login');
  };

  const handleAppNavigation = (event, to, navigate) => {
    closeMenu();

    if (shouldForceHardNavigation.value) {
      event.preventDefault();
      window.location.assign(router.resolve(to).href);
      return;
    }

    navigate(event);
  };

  onMounted(() => {
    document.addEventListener('click', handleDocumentClick);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick);
  });

  watch(
    () => route.fullPath,
    () => {
      closeMenu();
    }
  );
</script>
