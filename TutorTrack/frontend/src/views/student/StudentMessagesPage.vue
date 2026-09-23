<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Student messages</p>
          <h2>Tutor and manager communication</h2>
        </div>
      </div>
      <p class="muted">
        Start conversations with your tutors or the platform manager, then keep replies visible in one message hub.
      </p>
    </section>

    <div v-if="feedback.message" class="notice" :class="feedback.variant === 'error' ? 'notice-error' : 'notice-success'">
      {{ feedback.message }}
    </div>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <template v-else>
      <section class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Start new conversation</p>
            <h3>Message a tutor or manager</h3>
          </div>
        </div>

        <form class="form-grid two-column" @submit.prevent="createConversation">
          <label class="field">
            <span>Contact</span>
            <select v-model="form.recipientUserId" :disabled="creatingConversation || !contacts.length" required>
              <option value="">Select contact</option>
              <option v-for="contact in contacts" :key="`${contact.id}-${contact.role}`" :value="String(contact.id)">
                {{ contact.full_name }} - {{ roleLabel(contact.role) }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Subject</span>
            <input v-model="form.subject" :disabled="creatingConversation" required />
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            <span>Opening message</span>
            <textarea v-model="form.initialMessage" :disabled="creatingConversation" required></textarea>
          </label>
          <div class="actions-row" style="grid-column: 1 / -1;">
            <button class="primary-button" :disabled="creatingConversation || !contacts.length">
              {{ creatingConversation ? 'Starting conversation...' : 'Start conversation' }}
            </button>
          </div>
        </form>
      </section>

      <MessagesView
        :conversations="conversations"
        :active-conversation="activeConversation"
        :messages="messages"
        :current-user-id="auth.state.user?.id"
        title="Your conversations"
        subtitle="Message threads with tutors and managers are ordered by the latest activity."
        @select="selectConversation"
        @send="sendMessage"
      />
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '../../services/api';
import { useAuthStore } from '../../services/authStore';
import LoadingState from '../../components/LoadingState.vue';
import MessagesView from '../../components/MessagesView.vue';

const auth = useAuthStore();
const loading = ref(true);
const loadError = ref('');
const creatingConversation = ref(false);
const feedback = ref({ message: '', variant: 'success' });
const contacts = ref([]);
const conversations = ref([]);
const activeConversation = ref(null);
const messages = ref([]);

const form = reactive({
  recipientUserId: '',
  subject: '',
  initialMessage: ''
});

const roleLabel = (role) => {
  if (!role) {
    return 'Contact';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
};

const loadPage = async () => {
  const [contactsResponse, conversationsResponse] = await Promise.all([
    api.get('/users/message-directory'),
    api.get('/messages/conversations')
  ]);

  contacts.value = contactsResponse.data.data || [];
  conversations.value = conversationsResponse.data.data || [];

  if (conversations.value.length && !activeConversation.value) {
    await selectConversation(conversations.value[0].id);
  }
};

const selectConversation = async (conversationId) => {
  const response = await api.get(`/messages/conversations/${conversationId}`);
  activeConversation.value = response.data.data.conversation;
  messages.value = response.data.data.messages;
  await api.post(`/messages/conversations/${conversationId}/read`);
};

const createConversation = async () => {
  creatingConversation.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/messages/conversations', form);
    form.recipientUserId = '';
    form.subject = '';
    form.initialMessage = '';
    feedback.value = { message: 'Conversation started successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Conversation could not be created.',
      variant: 'error'
    };
  } finally {
    creatingConversation.value = false;
  }
};

const sendMessage = async (body) => {
  if (!activeConversation.value || !body) return;

  try {
    await api.post(`/messages/conversations/${activeConversation.value.id}/messages`, { body });
    await selectConversation(activeConversation.value.id);
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Message could not be sent.',
      variant: 'error'
    };
  }
};

onMounted(async () => {
  loading.value = true;
  loadError.value = '';

  try {
    await loadPage();
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Student messages could not be loaded right now.';
  } finally {
    loading.value = false;
  }
});
</script>
