<template>
  <div class="stack">
    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Manager messages</p>
          <h2>Platform communication</h2>
        </div>
      </div>
      <p class="muted">
        Start and review conversations with tutors, students, and parents from one manager message hub.
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
            <h3>Message a tutor, student, or parent</h3>
          </div>
        </div>

        <form class="form-grid two-column" @submit.prevent="createConversation">
          <div class="field" style="grid-column: 1 / -1;">
            <span>Recipient</span>
            <input
              v-model.trim="recipientSearch"
              type="search"
              :disabled="creatingConversation || !contacts.length"
              placeholder="Type a name, platform ID, or email"
              @input="handleRecipientInput"
            />
            <div class="recipient-picker">
              <button
                v-for="contact in filteredContacts"
                :key="`${contact.id}-${contact.role}`"
                type="button"
                class="recipient-option"
                :class="{ active: conversationForm.recipientUserId === String(contact.id) }"
                :disabled="creatingConversation"
                @click="selectRecipient(contact)"
              >
                <strong>{{ contact.full_name }}</strong>
                <span class="muted">{{ contact.platform_user_id || 'No ID' }} | {{ roleLabel(contact.role) }}</span>
                <span class="helper-text">{{ contact.email }}</span>
              </button>

              <p v-if="contacts.length && !filteredContacts.length" class="muted recipient-empty">
                User not found. Try a different name, platform ID, or email.
              </p>
            </div>
          </div>

          <label class="field">
            <span>Student context</span>
            <select v-model="conversationForm.studentUserId" :disabled="creatingConversation">
              <option value="">General conversation</option>
              <option v-for="student in students" :key="student.id" :value="String(student.id)">
                {{ student.full_name }}
              </option>
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
        title="Manager communication"
        subtitle="Keep tutor, student, and guardian follow-up in one place."
        search-placeholder="Search by subject, participant, or student"
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
const tutors = ref([]);
const students = ref([]);
const parents = ref([]);
const conversations = ref([]);
const activeConversation = ref(null);
const messages = ref([]);
const loading = ref(true);
const loadError = ref('');
const creatingConversation = ref(false);
const feedback = ref({ message: '', variant: 'success' });
const recipientSearch = ref('');

const conversationForm = reactive({
  recipientUserId: '',
  studentUserId: '',
  subject: '',
  initialMessage: ''
});

const contacts = computed(() => [
  ...tutors.value.map((item) => ({ ...item, role: 'tutor' })),
  ...students.value.map((item) => ({ ...item, role: 'student' })),
  ...parents.value.map((item) => ({ ...item, role: 'parent' }))
]);

const filteredContacts = computed(() => {
  const needle = recipientSearch.value.trim().toLowerCase();

  if (!needle) {
    return contacts.value;
  }

  return contacts.value.filter((contact) =>
    [contact.full_name, contact.platform_user_id, contact.email, roleLabel(contact.role)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  );
});

const roleLabel = (role) => {
  if (!role) {
    return 'Participant';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
};

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
      message: 'The selected contact is not available in the manager directory right now.',
      variant: 'error'
    };
    await clearPrefillQuery();
    return;
  }

  conversationForm.recipientUserId = recipientUserId;
  recipientSearch.value = recipient.full_name || '';

  const studentUserId = String(route.query.studentUserId || '').trim();
  conversationForm.studentUserId = students.value.some((student) => String(student.id) === studentUserId) ? studentUserId : '';
  conversationForm.subject = String(route.query.subject || '').trim();
  conversationForm.initialMessage = '';
  feedback.value = { message: `Conversation draft prepared for ${recipient.full_name}.`, variant: 'success' };
  await clearPrefillQuery();
};

const loadConversations = async (preferredConversationId = activeConversation.value?.id) => {
  const response = await api.get('/messages/conversations');
  conversations.value = response.data.data || [];

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
  const [tutorsResponse, studentsResponse, parentsResponse] = await Promise.all([
    api.get('/tutors?includeAll=true'),
    api.get('/students'),
    api.get('/parents')
  ]);

  tutors.value = tutorsResponse.data.data || [];
  students.value = studentsResponse.data.data || [];
  parents.value = parentsResponse.data.data || [];
};

const selectRecipient = (contact) => {
  conversationForm.recipientUserId = String(contact.id);
  recipientSearch.value = contact.full_name || '';
};

const handleRecipientInput = () => {
  const selectedContact = contacts.value.find(
    (contact) => String(contact.id) === String(conversationForm.recipientUserId)
  );

  if (!selectedContact) {
    conversationForm.recipientUserId = '';
    return;
  }

  if (String(selectedContact.full_name || '').trim().toLowerCase() !== recipientSearch.value.trim().toLowerCase()) {
    conversationForm.recipientUserId = '';
  }
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
  const recipientExists = contacts.value.some(
    (contact) => String(contact.id) === String(conversationForm.recipientUserId)
  );

  if (!recipientExists) {
    feedback.value = {
      message: 'User not found. Please select a valid recipient from the list.',
      variant: 'error'
    };
    return;
  }

  creatingConversation.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    const response = await api.post('/messages/conversations', conversationForm);
    conversationForm.recipientUserId = '';
    conversationForm.studentUserId = '';
    conversationForm.subject = '';
    conversationForm.initialMessage = '';
    recipientSearch.value = '';
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
  if (!activeConversation.value || !body) {
    return;
  }

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
    loadError.value = error.response?.data?.message || 'Manager messages could not be loaded right now.';
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

<style scoped>
.recipient-picker {
  margin-top: 10px;
  max-height: 220px;
  overflow-y: auto;
  display: grid;
  gap: 10px;
  padding: 4px;
}

.recipient-option {
  width: 100%;
  text-align: left;
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.recipient-option:hover,
.recipient-option:focus-visible {
  border-color: var(--primary-soft);
  background: var(--surface-subtle);
}

.recipient-option.active {
  border-color: var(--primary-soft);
  background: rgba(188, 226, 242, 0.5);
}

.recipient-empty {
  padding: 8px 4px 0;
}
</style>
