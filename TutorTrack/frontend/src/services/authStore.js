import { computed, reactive } from 'vue';
import api from './api';

const state = reactive({
  token: localStorage.getItem('tutortrack_token') || '',
  user: JSON.parse(localStorage.getItem('tutortrack_user') || 'null'),
  ready: false
});

const persist = () => {
  if (state.token) {
    localStorage.setItem('tutortrack_token', state.token);
  } else {
    localStorage.removeItem('tutortrack_token');
  }

  if (state.user) {
    localStorage.setItem('tutortrack_user', JSON.stringify(state.user));
  } else {
    localStorage.removeItem('tutortrack_user');
  }
};

const setSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  persist();
};

const clearSession = () => {
  state.token = '';
  state.user = null;
  persist();
};

const bootstrapAuth = () => {
  state.ready = true;
};

const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  setSession(response.data.data);
  return response.data.data;
};

const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  setSession(response.data.data);
  return response.data.data;
};

const fetchCurrentUser = async () => {
  if (!state.token) {
    clearSession();
    return null;
  }

  const response = await api.get('/auth/me');
  state.user = response.data.data;
  persist();
  return state.user;
};

const logout = async () => {
  if (state.token) {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout request failed, clearing local session anyway.');
    }
  }

  clearSession();
};

export const useAuthStore = () => ({
  state,
  isAuthenticated: computed(() => Boolean(state.token && state.user)),
  login,
  register,
  logout,
  fetchCurrentUser
});

export { bootstrapAuth, clearSession };

