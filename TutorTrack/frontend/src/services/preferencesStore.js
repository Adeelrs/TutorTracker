import { computed, reactive } from 'vue';

const state = reactive({
  theme: localStorage.getItem('tutortrack_theme') || 'light'
});

const applyTheme = (theme) => {
  state.theme = theme;
  localStorage.setItem('tutortrack_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
};

const bootstrapPreferences = () => {
  applyTheme(state.theme);
};

const toggleTheme = () => {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
};

export const usePreferencesStore = () => ({
  state,
  isDarkMode: computed(() => state.theme === 'dark'),
  applyTheme,
  toggleTheme
});

export { bootstrapPreferences };
