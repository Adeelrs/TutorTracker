<template>
  <div class="stack">
    <div class="split-grid summary-grid">
      <section class="panel summary-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Student summary</p>
            <h3>Learner profile</h3>
          </div>
        </div>

        <div class="summary-list">
          <div class="summary-item">
            <span class="muted">Student ID</span>
            <strong>{{ student.platform_user_id || 'Not assigned' }}</strong>
            <span class="muted">Full name</span>
            <strong>{{ student.full_name || 'Not set' }}</strong>
            <span class="muted">Email</span>
            <strong class="summary-text">{{ student.email || 'No email available' }}</strong>
            <span class="muted">Year group</span>
            <strong>{{ student.year_group || 'Not set' }}</strong>
            <span class="muted">Target grade</span>
            <strong>{{ student.target_grade || 'Not set' }}</strong>
            <span class="muted">Subject focus</span>
            <strong class="summary-text">{{ student.subject_focus || 'Not set' }}</strong>
          </div>
        </div>
      </section>

      <section class="panel summary-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Guardian summary</p>
            <h3>Linked guardians</h3>
          </div>
          <div v-if="guardians.length > 1" class="guardian-switcher">
            <button
              v-for="(guardian, index) in guardians"
              :key="guardian.id || guardian.user_id || index"
              type="button"
              class="guardian-switcher-button"
              :class="{ active: activeGuardianIndex === index }"
              @click="activeGuardianIndex = index"
            >
              {{ ordinalLabel(index) }}
            </button>
          </div>
        </div>

        <EmptyState
          v-if="!guardians.length"
          title="No guardian linked"
          message="Guardian information will appear here once an adult contact is connected to this student."
        />

        <div v-else class="guardian-stack">
          <article v-for="(guardian, index) in visibleGuardians" :key="guardian.id || guardian.user_id" class="guardian-card">
            <div class="guardian-header">
              <div>
                <strong>{{ ordinalLabel(activeGuardianIndex) }} guardian</strong>
                <p class="helper-text">{{ guardian.relationship_label || 'Guardian' }}</p>
              </div>
            </div>

            <div class="summary-list compact">
              <div class="summary-item">
                <span class="muted">Guardian name</span>
                <strong>{{ guardian.full_name || 'Not set' }}</strong>
                <span class="muted">Guardian email</span>
                <strong class="summary-text">{{ guardian.email || 'No email available' }}</strong>
                <span class="muted">Guardian phone</span>
                <strong>{{ guardian.phone_number || 'No phone number available' }}</strong>
                <span class="muted">Relationship</span>
                <strong>{{ guardian.relationship_label || 'Guardian' }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Subjects</p>
          <h3>Current learning areas</h3>
        </div>
        <p class="muted">
          {{ selectedSubject === 'all' ? 'Showing sessions across all subjects.' : `Filtering sessions to ${selectedSubject}.` }}
        </p>
      </div>

      <div class="subject-actions">
        <button
          type="button"
          class="subject-card clear-card"
          :class="{ active: selectedSubject === 'all' }"
          @click="selectedSubject = 'all'"
        >
          <span class="subject-title">All subjects</span>
          <span class="helper-text">{{ visibleSessionsAll.length }} session{{ visibleSessionsAll.length === 1 ? '' : 's' }}</span>
        </button>

        <button
          v-for="subject in subjects"
          :key="subject.name"
          type="button"
          class="subject-card"
          :class="{ active: selectedSubject === subject.name }"
          :style="subjectStyle(subject)"
          @click="selectedSubject = subject.name"
        >
          <span class="subject-title">{{ subject.name }}</span>
          <span class="helper-text">{{ subject.count }} session{{ subject.count === 1 ? '' : 's' }}</span>
        </button>
      </div>
    </section>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Sessions</p>
          <h3>{{ selectedSubject === 'all' ? 'Recorded sessions' : `${selectedSubject} sessions` }}</h3>
        </div>
      </div>

      <EmptyState
        v-if="!visibleSessions.length"
        title="No sessions to show"
        message="Recorded session reports will appear here once tutoring sessions have been logged."
      />

      <div v-else class="table-wrap table-scroll student-session-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Subject</th>
              <th>Tutor</th>
              <th>Attendance</th>
              <th>Summary</th>
              <th>Report</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in visibleSessions" :key="session.id">
              <td>{{ formatDateOnly(session.session_date) }}</td>
              <td>{{ formatTimeOnly(session.session_date) }}</td>
              <td>{{ session.topic || session.booking_subject || 'General' }}</td>
              <td>{{ session.tutor_name || 'TutorTrack tutor' }}</td>
              <td>
                <UserBadge :text="attendanceLabel(session.attendance_status)" :variant="attendanceVariant(session.attendance_status)" />
              </td>
              <td class="session-summary-cell">{{ previewText(session.next_steps || session.notes, 'Open the report to review this session.') }}</td>
              <td class="report-action-cell">
                <button type="button" class="secondary-button compact-button" @click="openSession(session.id)">
                  Report
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from './EmptyState.vue';
import UserBadge from './UserBadge.vue';

const props = defineProps({
  dashboardData: {
    type: Object,
    default: () => ({})
  },
  sessions: {
    type: Array,
    default: () => []
  },
  sessionBasePath: {
    type: String,
    required: true
  },
  routeQuery: {
    type: Object,
    default: () => ({})
  },
  forceHardNavigation: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();
const selectedSubject = ref('all');
const activeGuardianIndex = ref(0);

const SUBJECT_OPTIONS = [
  'Mathematics',
  'English',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'History',
  'Geography',
  'Computer Science',
  'Business Studies'
];

const SUBJECT_KEYWORDS = [
  { name: 'Mathematics', keywords: ['mathematics', 'maths', 'math', 'algebra', 'equation', 'equations', 'fractions', 'percentages', 'ratio', 'ratios', 'numeracy', 'arithmetic', 'number bonds', 'probability', 'averages', 'statistics', 'geometry', 'trigonometry'] },
  { name: 'English', keywords: ['english', 'english language', 'english literature', 'literature', 'essay', 'quotation', 'poetry', 'novel', 'drama', 'grammar', 'comprehension', 'writing', 'language analysis', 'non-fiction'] },
  { name: 'Biology', keywords: ['biology', 'cells', 'ecology', 'genetics'] },
  { name: 'Chemistry', keywords: ['chemistry', 'atoms', 'bonding', 'reaction'] },
  { name: 'Physics', keywords: ['physics', 'forces', 'energy', 'electricity'] },
  { name: 'Combined Science', keywords: ['combined science', 'science'] },
  { name: 'History', keywords: ['history', 'historical', 'chronology'] },
  { name: 'Geography', keywords: ['geography', 'climate', 'rivers', 'coasts'] },
  { name: 'Computer Science', keywords: ['computer science', 'coding', 'programming', 'algorithm'] },
  { name: 'Business Studies', keywords: ['business studies', 'business', 'enterprise', 'marketing'] }
];

const SUBJECT_COLORS = [
  { accent: '#165b6d', surface: 'rgba(22, 91, 109, 0.14)', ink: '#165b6d' },
  { accent: '#2d7b57', surface: 'rgba(45, 123, 87, 0.14)', ink: '#2d7b57' },
  { accent: '#b47a2a', surface: 'rgba(180, 122, 42, 0.16)', ink: '#8b5d15' },
  { accent: '#a14f83', surface: 'rgba(161, 79, 131, 0.14)', ink: '#8a3f70' },
  { accent: '#5c6ea8', surface: 'rgba(92, 110, 168, 0.16)', ink: '#4a5b91' },
  { accent: '#9b6b32', surface: 'rgba(155, 107, 50, 0.15)', ink: '#855622' }
];

const safeSessions = computed(() =>
  Array.isArray(props.sessions)
    ? props.sessions.filter((session) => session && typeof session === 'object')
    : []
);

const student = computed(() =>
  props.dashboardData?.student && typeof props.dashboardData.student === 'object'
    ? props.dashboardData.student
    : {}
);

const guardians = computed(() =>
  Array.isArray(props.dashboardData?.guardians)
    ? props.dashboardData.guardians.filter((guardian) => guardian && typeof guardian === 'object').slice(0, 2)
    : []
);

const visibleGuardians = computed(() => {
  if (!guardians.value.length) {
    return [];
  }

  const safeIndex = Math.min(activeGuardianIndex.value, guardians.value.length - 1);
  return [guardians.value[safeIndex]];
});

const visibleSessionsAll = computed(() =>
  [...safeSessions.value].sort((left, right) => parseSessionTimestamp(right.session_date) - parseSessionTimestamp(left.session_date))
);

const subjects = computed(() => {
  const subjectNames = [
    ...extractSubjects(student.value?.subject_focus),
    ...safeSessions.value.flatMap((session) => resolveSessionSubjects(session))
  ];

  const uniqueNames = [...new Set(subjectNames.filter(Boolean))];

  return uniqueNames.map((name, index) => ({
    name,
    count: safeSessions.value.filter((session) => sessionMatchesSubject(session, name)).length,
    color: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
  }));
});

const visibleSessions = computed(() => {
  if (selectedSubject.value === 'all') {
    return visibleSessionsAll.value;
  }

  return visibleSessionsAll.value.filter((session) => sessionMatchesSubject(session, selectedSubject.value));
});

watch(
  () => student.value?.id,
  () => {
    selectedSubject.value = 'all';
    activeGuardianIndex.value = 0;
  }
);

watch(
  () => subjects.value.map((subject) => subject.name),
  (subjectNames) => {
    if (selectedSubject.value === 'all') {
      return;
    }

    if (!subjectNames.includes(selectedSubject.value)) {
      selectedSubject.value = 'all';
    }
  }
);

watch(
  () => guardians.value.length,
  (length) => {
    if (!length) {
      activeGuardianIndex.value = 0;
      return;
    }

    if (activeGuardianIndex.value > length - 1) {
      activeGuardianIndex.value = 0;
    }
  }
);

const openSession = (sessionId) => {
  const target = {
    path: `${props.sessionBasePath}/${sessionId}`,
    query: props.routeQuery
  };

  if (props.forceHardNavigation) {
    window.location.assign(router.resolve(target).href);
    return;
  }

  router.push(target);
};

const subjectStyle = (subject) => ({
  '--subject-accent': subject.color.accent,
  '--subject-surface': subject.color.surface,
  '--subject-ink': subject.color.ink
});

function extractSubjects(value) {
  const text = String(value || '').trim();

  if (!text) {
    return [];
  }

  const normalised = text.toLowerCase();
  const matchedOptions = SUBJECT_OPTIONS.filter((subject) => normalised.includes(subject.toLowerCase()));
  const keywordMatches = SUBJECT_KEYWORDS.filter((subject) =>
    subject.keywords.some((keyword) => normalised.includes(keyword))
  ).map((subject) => subject.name);
  const separatedMatches = text
    .split(/[;,/]| and /gi)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(findCanonicalSubject)
    .filter(Boolean);

  return [...new Set([...matchedOptions, ...keywordMatches, ...separatedMatches])];
}

function sessionMatchesSubject(session, subjectName) {
  const sessionSubjects = resolveSessionSubjects(session);

  if (sessionSubjects.includes(subjectName)) {
    return true;
  }

  const studentSubjects = extractSubjects(student.value?.subject_focus || '');

  if (studentSubjects.includes(subjectName) && sessionSubjects.length === 0) {
    return true;
  }

  if (studentSubjects.length === 1 && studentSubjects[0] === subjectName) {
    return true;
  }

  return false;
}

function resolveSessionSubjects(session) {
  const recordedSubjects = extractSubjects(
    session?.subject || session?.booking_subject || session?.bookingSubject || ''
  );

  if (recordedSubjects.length) {
    return recordedSubjects;
  }

  return extractSubjects(session?.topic || '');
}

function ordinalLabel(index) {
  if (index === 0) return '1st';
  if (index === 1) return '2nd';
  if (index === 2) return '3rd';
  return `${index + 1}th`;
}

function formatDateOnly(value) {
  const parsed = parseSessionDate(value);

  if (!parsed) {
    return 'No date';
  }

  return parsed.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTimeOnly(value) {
  const parsed = parseSessionDate(value);

  if (!parsed) {
    return 'No time';
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseSessionDate(value) {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseSessionTimestamp(value) {
  return parseSessionDate(value)?.getTime() || 0;
}

function attendanceLabel(status) {
  if (!status) {
    return 'Not marked';
  }

  if (status === 'not_present') {
    return 'Not present';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function attendanceVariant(status) {
  if (status === 'present') return 'success';
  if (status === 'late') return 'warning';
  if (status === 'not_present' || status === 'cancelled') return 'danger';
  return 'default';
}

function previewText(value, fallback) {
  const text = String(value || '').trim() || fallback;
  return text.length > 110 ? `${text.slice(0, 107)}...` : text;
}

function findCanonicalSubject(value) {
  const text = String(value || '').trim().toLowerCase();

  if (!text) {
    return '';
  }

  const directMatch = SUBJECT_OPTIONS.find((subject) => subject.toLowerCase() === text);

  if (directMatch) {
    return directMatch;
  }

  const keywordMatch = SUBJECT_KEYWORDS.find((subject) =>
    subject.keywords.some((keyword) => keyword === text)
  );

  return keywordMatch?.name || '';
}

</script>

<style scoped>
.summary-grid {
  align-items: start;
}

.summary-card {
  gap: 18px;
}

.summary-list {
  display: grid;
  gap: 12px;
}

.summary-list.compact {
  gap: 10px;
}

.summary-item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
}

.summary-text {
  word-break: break-word;
  line-height: 1.5;
}

.guardian-stack {
  display: grid;
  gap: 14px;
}

.guardian-card {
  display: grid;
  gap: 12px;
}

.guardian-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.guardian-switcher-button {
  min-width: 44px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
  color: var(--muted);
  font-weight: 700;
}

.guardian-switcher-button.active {
  border-color: var(--primary);
  background: rgba(25, 121, 142, 0.12);
  color: var(--heading);
}

.guardian-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.subject-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.subject-card {
  min-width: 180px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--subject-surface, var(--surface-subtle));
  color: var(--subject-ink, var(--ink));
  display: grid;
  gap: 6px;
  text-align: left;
  box-shadow: inset 0 0 0 1px transparent;
}

.subject-card.active {
  border-color: var(--subject-accent, var(--primary));
  box-shadow: inset 0 0 0 1px var(--subject-accent, var(--primary));
}

.clear-card {
  background: var(--surface-subtle);
  color: var(--ink);
}

.subject-title {
  font-weight: 700;
}

.student-session-wrap {
  max-height: 360px;
}

.session-summary-cell {
  min-width: 240px;
  line-height: 1.5;
}

.report-action-cell {
  width: 1%;
  white-space: nowrap;
}

.compact-button {
  padding: 8px 12px;
  font-size: 0.84rem;
}

@media (max-width: 760px) {
  .guardian-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .subject-card {
    width: 100%;
  }
}
</style>
