<template>
  <section class="panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Messages</p>
        <h3>{{ title }}</h3>
      </div>
      <p>{{ subtitle }}</p>
    </div>

    <div class="chat-layout">
      <div class="card">
        <label class="field">
          <span>Search conversations</span>
          <input v-model="search" type="text" :placeholder="searchPlaceholder" />
        </label>

        <div class="conversation-list" style="margin-top: 14px;">
          <div class="stack">
            <button
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              class="conversation-button"
              :class="{ active: activeConversation?.id === conversation.id }"
              @click="$emit('select', conversation.id)"
            >
              <div class="section-header" style="margin-bottom: 8px;">
                <strong>{{ conversation.subject }}</strong>
                <UserBadge
                  v-if="Number(conversation.unread_count) > 0"
                  :text="`${conversation.unread_count} new`"
                  variant="warning"
                />
              </div>
              <div class="participant-row">
                <span
                  v-for="participant in participantsFor(conversation)"
                  :key="`${conversation.id}-${participant.name}-${participant.role}`"
                  class="participant-chip"
                >
                  {{ participant.role }}: {{ participant.name }}
                </span>
              </div>
              <p v-if="conversation.student_name" class="helper-text" style="margin-top: 8px;">
                Context student: {{ conversation.student_name }}
              </p>
              <p class="muted" style="margin-top: 8px;">
                {{ conversation.latest_message || 'Open this thread to start messaging.' }}
              </p>
              <p class="helper-text" style="margin-top: 8px;">
                Last active: {{ formatDate(conversation.last_message_at || conversation.created_at) }}
              </p>
            </button>

            <EmptyState
              v-if="!filteredConversations.length"
              title="No conversations found"
              message="Try a different search term or start a new conversation."
            />
          </div>
        </div>
      </div>

      <div class="card">
        <EmptyState
          v-if="!activeConversation"
          title="Choose a conversation"
          message="Select a thread on the left to read and reply."
        />

        <div v-else class="stack">
          <div class="message-header">
            <p class="eyebrow">Conversation title</p>
            <h4>{{ activeConversation.subject }}</h4>
            <div class="participant-row" style="margin-top: 10px;">
              <span
                v-for="participant in participantsFor(activeConversation)"
                :key="`${activeConversation.id}-${participant.name}-${participant.role}`"
                class="participant-chip"
              >
                {{ participant.role }}: {{ participant.name }}
              </span>
            </div>
            <p v-if="activeConversation.student_name" class="muted" style="margin-top: 8px;">
              Student context: {{ activeConversation.student_name }}
            </p>
          </div>

          <div class="message-thread">
            <article
              v-for="message in messages"
              :key="message.id"
              class="chat-bubble-row"
              :class="message.sender_user_id === currentUserId ? 'outgoing' : 'incoming'"
            >
              <div
                class="chat-bubble"
                :class="message.sender_user_id === currentUserId ? 'outgoing' : 'incoming'"
              >
                <div class="bubble-header">
                  <strong>{{ message.sender_name }}</strong>
                  <span class="helper-text">{{ roleLabel(message.sender_role) }}</span>
                </div>
                <p style="margin-top: 6px;">{{ message.body }}</p>
                <p class="helper-text" style="margin-top: 8px;">
                  {{ formatDate(message.created_at) }}
                </p>
              </div>
            </article>
          </div>

          <form class="form-grid" @submit.prevent="handleSend">
            <label class="field">
              <span>Reply</span>
              <textarea v-model="draft" placeholder="Write a message..." />
            </label>
            <div class="actions-row">
              <button class="primary-button">Send message</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import EmptyState from './EmptyState.vue';
import UserBadge from './UserBadge.vue';

const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  activeConversation: {
    type: Object,
    default: null
  },
  messages: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: Number,
    default: null
  },
  title: {
    type: String,
    default: 'Communication hub'
  },
  subtitle: {
    type: String,
    default: 'Ordered by the most recent activity so follow-up work is easy to track.'
  },
  searchPlaceholder: {
    type: String,
    default: 'Search by subject or participant'
  }
});

const emit = defineEmits(['select', 'send']);
const draft = ref('');
const search = ref('');

const filteredConversations = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return props.conversations;
  }

  return props.conversations.filter((conversation) =>
    [
      conversation.subject,
      conversation.participant_one_name,
      conversation.participant_one_role,
      conversation.participant_two_name,
      conversation.participant_two_role,
      conversation.student_name,
      conversation.latest_message
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term))
  );
});

const roleLabel = (role) => {
  if (!role) {
    return 'Participant';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatDate = (value) => {
  if (!value) {
    return 'No recent activity';
  }

  return new Date(value).toLocaleString();
};

const participantsFor = (conversation) => {
  if (!conversation) {
    return [];
  }

  return [
    {
      name: conversation.participant_one_name,
      role: roleLabel(conversation.participant_one_role)
    },
    {
      name: conversation.participant_two_name,
      role: roleLabel(conversation.participant_two_role)
    }
  ].filter((participant) => participant.name);
};

const handleSend = () => {
  if (!draft.value.trim()) {
    return;
  }

  emit('send', draft.value.trim());
  draft.value = '';
};

watch(
  () => props.activeConversation?.id,
  () => {
    draft.value = '';
  }
);
</script>

<style scoped>
.message-header {
  display: grid;
  gap: 4px;
}

.conversation-button strong {
  color: inherit;
}

.participant-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.participant-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
  font-size: 0.82rem;
  font-weight: 700;
}

.bubble-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

[data-theme='dark'] .conversation-button {
  color: #f5f8fb;
}

[data-theme='dark'] .conversation-button .participant-chip {
  color: #f5f8fb;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(226, 236, 244, 0.18);
}

[data-theme='dark'] .conversation-button .muted,
[data-theme='dark'] .conversation-button .helper-text {
  color: #d8e3eb;
}
</style>
