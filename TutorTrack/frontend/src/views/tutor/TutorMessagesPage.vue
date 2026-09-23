<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Tutor messages</p>
          <h2>Student, guardian, and manager communication</h2>
        </div>
      </div>
      <p class="muted">
        Start structured conversations with students, parents, and your assigned manager, then keep follow-ups visible in the latest-first thread list.
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
            <h3>Message a student, parent, or manager</h3>
          </div>
        </div>

        <p v-if="!contacts.length" class="muted">
          No tutor-linked contacts are available yet. Once relationships or manager assignment are in place, conversations can start here.
        </p>

        <form class="form-grid two-column" @submit.prevent="createConversation">
          <label class="field">
            <span>Recipient</span>
            <select v-model="conversationForm.recipientUserId" :disabled="creatingConversation || !contacts.length" required>
              <option value="">Choose contact</option>
              <option v-for="contact in contacts" :key="`${contact.id}-${contact.role}`" :value="contact.id">
                {{ contact.full_name }} - {{ roleLabel(contact.role) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Student context</span>
            <select v-model="conversationForm.studentUserId" :disabled="creatingConversation">
              <option value="">General conversation</option>
              <option v-for="student in students" :key="student.id" :value="student.id">{{ student.full_name }}</option>
            </select>
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>Subject</span>
            <input v-model="conversationForm.subject" :disabled="creatingConversation" required />
          </label>

          <label class="field" style="grid-column: 1 / -1;">
            <span>Opening message</span>
            <textarea v-model="conversationForm.initialMessage" :disabled="creatingConversation" required></textarea>
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
        @select="selectConversation"
        @send="sendMessage"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import { useAuthStore } from '../../services/authStore';
import LoadingState from '../../components/LoadingState.vue';
import MessagesView from '../../components/MessagesView.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const students = ref([]);
const parents = ref([]);
const manager = ref(null);
const conversations = ref([]);
const activeConversation = ref(null);
const messages = ref([]);
const loading = ref(true);
const loadError = ref('');
const creatingConversation = ref(false);
const feedback = ref({ message: '', variant: 'success' });

const conversationForm = reactive({
  recipientUserId: '',
  studentUserId: '',
  subject: '',
  initialMessage: ''
});

const contacts = computed(() => [
  ...students.value.map((student) => ({ ...student, role: 'student' })),
  ...parents.value.map((parent) => ({ ...parent, role: 'parent' })),
  ...(manager.value ? [{ ...manager.value, role: 'manager' }] : [])
]);

const clearPrefillQuery = async () => {
  const nextQuery = { ...route.query };
  delete nextQuery.recipientUserId;
  delete nextQuery.studentUserId;
  delete nextQuery.subject;
  await router.replace({ query: nextQuery });
};

const applyPrefillFromQuery = async () => {
  const recipientUserId = String(route.query.recipientUserId || '').trim();

  if (!recipientUserId || !contacts.value.length) {
    return;
  }

  const recipient = contacts.value.find((contact) => String(contact.id) === recipientUserId);

  if (!recipient) {
    feedback.value = {
      message: 'That contact is not available in the tutor message directory yet.',
      variant: 'error'
    };
    await clearPrefillQuery();
    return;
  }

  conversationForm.recipientUserId = recipientUserId;

  const studentUserId = String(route.query.studentUserId || '').trim();
  conversationForm.studentUserId = students.value.some((student) => String(student.id) === studentUserId) ? studentUserId : '';
  conversationForm.subject = String(route.query.subject || '').trim();
  conversationForm.initialMessage = '';
  feedback.value = { message: `Conversation draft prepared for ${recipient.full_name}.`, variant: 'success' };
  await clearPrefillQuery();
};

const roleLabel = (role) => {
  if (!role) {
    return 'Participant';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
};

const loadConversations = async (preferredConversationId = activeConversation.value?.id) => {
  const response = await api.get('/messages/conversations');
  conversations.value = response.data.data;

  if (!conversations.value.length) {
    activeConversation.value = null;
    messages.value = [];
    return;
  }

  const targetConversation =
    conversations.value.find((conversation) => Number(conversation.id) === Number(preferredConversationId)) ||
    conversations.value[0];

  if (!activeConversation.value || Number(activeConversation.value.id) !== Number(targetConversation.id)) {
    await selectConversation(targetConversation.id, false);
  }
};

const loadDirectory = async () => {
  const [studentsResponse, parentsResponse, profileResponse] = await Promise.all([
    api.get('/students'),
    api.get('/parents'),
    api.get('/users/me')
  ]);

  students.value = studentsResponse.data.data;
  parents.value = parentsResponse.data.data;
  manager.value = profileResponse.data.data?.assignedManager || null;
};

const selectConversation = async (conversationId, refreshList = true) => {
  const response = await api.get(`/messages/conversations/${conversationId}`);
  activeConversation.value = response.data.data.conversation;
  messages.value = response.data.data.messages;
  await api.post(`/messages/conversations/${conversationId}/read`);

  if (refreshList) {
    await loadConversations(conversationId);
  }
};

const createConversation = async () => {
  creatingConversation.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    const response = await api.post('/messages/conversations', conversationForm);
    conversationForm.recipientUserId = '';
    conversationForm.studentUserId = '';
    conversationForm.subject = '';
    conversationForm.initialMessage = '';
    feedback.value = { message: 'Conversation started successfully.', variant: 'success' };
    await loadConversations(response.data.data.id);
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

  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post(`/messages/conversations/${activeConversation.value.id}/messages`, { body });
    await selectConversation(activeConversation.value.id);
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
    await loadDirectory();
    await loadConversations();
    await applyPrefillFromQuery();
  } catch (error) {
    loadError.value = error.response?.data?.message || 'Tutor messages could not be loaded right now.';
  } finally {
    loading.value = false;
  }
});

watch(
  () => route.fullPath,
  () => {
    applyPrefillFromQuery();
  }
);
</script>
