<template>
  <div class="stack">
    <div
      v-if="feedback.message"
      class="notice"
      :class="feedback.type === 'error' ? 'notice-error' : 'notice-success'"
    >
      <strong>{{ feedback.message }}</strong>
    </div>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Profile</p>
          <h2>Account and identity</h2>
        </div>
        <UserBadge :text="profile.role" />
      </div>

      <form class="form-grid two-column" @submit.prevent="saveProfile">
        <label class="field">
          <span>Display name</span>
          <input v-model="form.displayName" />
        </label>

        <label class="field">
          <span>Platform user ID</span>
          <input :value="profile.platform_user_id || ''" disabled />
        </label>

        <label class="field">
          <span>Email</span>
          <input :value="profile.email || ''" disabled />
        </label>

        <label v-if="profile.role !== 'student'" class="field">
          <span>Phone number</span>
          <input v-model="form.phoneNumber" />
        </label>

        <label v-if="profile.role === 'tutor'" class="field">
          <span>Specialism</span>
          <input v-model="form.specialism" />
        </label>

        <label v-if="profile.role === 'manager'" class="field">
          <span>Title</span>
          <input v-model="form.title" />
        </label>

        <label v-if="profile.role === 'student'" class="field">
          <span>Year group</span>
          <input v-model="form.yearGroup" />
        </label>

        <label v-if="profile.role === 'student'" class="field">
          <span>Target grade</span>
          <input v-model="form.targetGrade" />
        </label>

        <label v-if="profile.role === 'student'" class="field" style="grid-column: 1 / -1;">
          <span>Subject focus</span>
          <input v-model="form.subjectFocus" />
        </label>

        <label v-if="profile.role === 'tutor'" class="field" style="grid-column: 1 / -1;">
          <span>Bio</span>
          <textarea v-model="form.bio"></textarea>
        </label>

        <div v-if="profile.role === 'tutor'" class="field teaching-section" style="grid-column: 1 / -1;">
          <div class="teaching-section-header">
            <span>Teaching profile</span>
            <button type="button" class="ghost-button" @click="openTeachingEditor">
              Edit teaching profile
            </button>
          </div>

          <div
            v-for="section in tutorTeachingSections"
            :key="section.label"
            class="teaching-section-block"
          >
            <span class="muted">{{ section.label }}</span>
            <div v-if="section.items.length" class="teaching-chip-list">
              <span v-for="item in section.items" :key="item" class="teaching-chip">
                {{ item }}
              </span>
            </div>
            <p v-else class="muted" style="margin-top: 10px;">Nothing added yet.</p>
          </div>
        </div>

        <div
          v-if="profile.role === 'tutor' && showTeachingEditor"
          class="field teaching-edit-section"
          style="grid-column: 1 / -1;"
        >
          <div class="teaching-edit-group">
            <span class="muted">Stages willing to teach</span>
            <div class="teaching-chip-list">
              <label
                v-for="stage in learningStages"
                :key="stage"
                class="teaching-edit-chip"
                :class="{ active: form.stagesTaught.includes(stage) }"
              >
                <input
                  type="checkbox"
                  :checked="form.stagesTaught.includes(stage)"
                  @change="toggleOption(form.stagesTaught, stage)"
                />
                <span>{{ formatStageLabel(stage) }}</span>
              </label>
            </div>
          </div>

          <div class="teaching-edit-group">
            <span class="muted">Subjects willing to teach</span>
            <div class="teaching-chip-list">
              <label
                v-for="subject in tutoringSubjects"
                :key="subject"
                class="teaching-edit-chip"
                :class="{ active: form.subjectsTaught.includes(subject) }"
              >
                <input
                  type="checkbox"
                  :checked="form.subjectsTaught.includes(subject)"
                  @change="toggleOption(form.subjectsTaught, subject)"
                />
                <span>{{ subject }}</span>
              </label>
            </div>
          </div>

          <div class="teaching-edit-group">
            <span class="muted">Exam boards familiar with</span>
            <div class="teaching-chip-list">
              <label
                v-for="board in examBoards"
                :key="board"
                class="teaching-edit-chip"
                :class="{ active: form.examBoardsTaught.includes(board) }"
              >
                <input
                  type="checkbox"
                  :checked="form.examBoardsTaught.includes(board)"
                  @change="toggleOption(form.examBoardsTaught, board)"
                />
                <span>{{ board }}</span>
              </label>
            </div>
          </div>

          <div class="actions-row teaching-edit-actions">
            <button type="button" class="primary-button" @click="saveTeachingProfile">
              Save teaching profile
            </button>
            <button type="button" class="ghost-button" @click="cancelTeachingEditor">
              Cancel
            </button>
          </div>
        </div>

        <div class="actions-row" style="grid-column: 1 / -1;">
          <button class="primary-button">Save profile</button>
          <button type="button" class="ghost-button" @click="showPasswordForm = !showPasswordForm">
            Change password
          </button>
          <button type="button" class="secondary-button" @click="handleLogout">Logout</button>
        </div>
      </form>
    </section>

    <section v-if="showPasswordForm" class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Security</p>
          <h3>Change password</h3>
        </div>
      </div>

      <form class="form-grid single-column"  @submit.prevent="changePassword">
        <label class="field">
          <span>Current password</span>
          <input v-model="passwordForm.currentPassword" type="password" required />
        </label>
        <label class="field">
          <span>New password</span>
          <input v-model="passwordForm.newPassword" type="password" minlength="8" required />
        </label>
        <label class="field">
          <span>Confirm new password</span>
          <input v-model="passwordForm.confirmNewPassword" type="password" minlength="8" required />
        </label>
        <div v-if="passwordsDoNotMatch" class="notice notice-error" style="grid-column: 1 / -1;">
          <strong>New password and confirm password do not match.</strong>
        </div>
        <div
          v-if="passwordFeedback.message"
          class="notice"
          :class="passwordFeedback.type === 'error' ? 'notice-error' : 'notice-success'"
          style="grid-column: 1 / -1;"
        >
          <strong>{{ passwordFeedback.message }}</strong>
        </div>
        <div class="actions-row" style="grid-column: 1 / -1;">
          <button class="primary-button">Update password</button>
        </div>
      </form>
    </section>

    <section v-if="profile.role === 'student'" class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Linked guardians</p>
          <h3>Guardian visibility</h3>
        </div>
      </div>
      <div class="status-list list-scroll">
        <article v-for="guardian in profile.linkedGuardians || []" :key="guardian.id" class="status-item">
          <div>
            <strong>{{ guardian.full_name }}</strong>
            <p class="muted">{{ guardian.email }}</p>
          </div>
          <p class="muted">{{ guardian.relationship_label || 'Guardian' }}</p>
        </article>
      </div>
    </section>

    <section v-if="profile.role === 'parent'" class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Linked children</p>
          <h3>Guardian account view</h3>
        </div>
        <button class="primary-button" @click="showChildSignup = !showChildSignup">
          Sign up child
        </button>
      </div>

      <div class="status-list list-scroll">
        <article v-for="child in profile.linkedChildren || []" :key="child.id" class="status-item">
          <div>
            <strong>{{ child.full_name }}</strong>
            <p class="muted">{{ child.year_group || 'Year not set' }} | {{ child.target_grade || 'Target not set' }}</p>
          </div>
          <p class="muted">{{ child.relationship_label || 'Linked child' }}</p>
        </article>
      </div>

      <form v-if="showChildSignup" class="form-grid two-column" style="margin-top: 18px;" @submit.prevent="createChildAccount">
        <label class="field">
          <span>First name</span>
          <input v-model="childForm.firstName" required />
        </label>
        <label class="field">
          <span>Surname</span>
          <input v-model="childForm.surname" required />
        </label>
        <label class="field">
          <span>Email</span>
          <input v-model="childForm.email" type="email" required />
        </label>
        <label class="field">
          <span>Relationship label</span>
          <input v-model="childForm.relationshipLabel" placeholder="Mother, Father, Guardian..." />
        </label>
        <label class="field">
          <span>Year group</span>
          <select v-model="childForm.yearGroup">
            <option value="">Select year group</option>
            <option v-for="year in yearGroups" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
        <label class="field">
          <span>Target grade</span>
          <input v-model="childForm.targetGrade" />
        </label>
        <label class="field" style="grid-column: 1 / -1;">
          <span>Subject focus</span>
          <input v-model="childForm.subjectFocus" />
        </label>
        <label class="field" style="grid-column: 1 / -1;">
          <span>Notes</span>
          <textarea v-model="childForm.notes"></textarea>
        </label>
        <div class="actions-row" style="grid-column: 1 / -1;">
          <button class="secondary-button">Create child account</button>
        </div>
      </form>

      <div v-if="childSignupResult" class="notice notice-success" style="margin-top: 16px;">
        <strong>Child account created</strong>
        <p class="muted" style="margin-top: 6px;">
          Platform ID: {{ childSignupResult.childUser.platform_user_id }} | Temporary password:
          <strong>{{ childSignupResult.temporaryPassword }}</strong>
        </p>
      </div>
    </section>

    <section v-if="profile.role === 'tutor'" class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Manager link</p>
          <h3>Assigned manager</h3>
        </div>
      </div>
      <p class="muted" v-if="profile.assignedManager">
        {{ profile.assignedManager.full_name }} | {{ profile.assignedManager.email }}
      </p>
      <p class="muted" v-else>No manager has been linked to this tutor yet.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../services/authStore';
import UserBadge from '../components/UserBadge.vue';

const learningStages = [
  'Primary (Years 1-6 / ages 5-11)',
  'Secondary (Years 7-11 / ages 11-16)',
  'Post-16 / College (Years 12-13 / ages 16-18)'
];

const examBoards = ['AQA', 'OCR', 'Pearson Edexcel', 'WJEC Eduqas'];

const tutoringSubjects = [
  'Mathematics',
  'English Language',
  'English Literature',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'History',
  'Geography',
  'Computer Science',
  'Business',
  'Economics',
  'Psychology'
];

const yearGroups = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
  'Year 13'
];

const router = useRouter();
const auth = useAuthStore();

const profile = ref({});
const showPasswordForm = ref(false);
const showChildSignup = ref(false);
const childSignupResult = ref(null);
const showTeachingEditor = ref(false);
const feedback = reactive({
  type: 'success',
  message: ''
});
const passwordFeedback = reactive({
  type: 'success',
  message: ''
});

const form = reactive({
  displayName: '',
  phoneNumber: '',
  specialism: '',
  bio: '',
  yearGroup: '',
  targetGrade: '',
  subjectFocus: '',
  title: '',
  stagesTaught: [],
  subjectsTaught: [],
  examBoardsTaught: []
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
});

const childForm = reactive({
  firstName: '',
  surname: '',
  email: '',
  relationshipLabel: 'Guardian',
  yearGroup: '',
  targetGrade: '',
  subjectFocus: '',
  notes: ''
});

const passwordsDoNotMatch = computed(
  () =>
    Boolean(passwordForm.confirmNewPassword) &&
    passwordForm.newPassword !== passwordForm.confirmNewPassword
);

const stageLabelMap = {
  'Primary (Years 1-6 / ages 5-11)': 'Primary school',
  'Secondary (Years 7-11 / ages 11-16)': 'Secondary school',
  'Post-16 / College (Years 12-13 / ages 16-18)': 'College / post-16'
};

const formatStageLabel = (stage) => stageLabelMap[stage] || stage;

const tutorTeachingSections = computed(() => [
  {
    label: 'Stages willing to teach',
    items: form.stagesTaught.map((stage) => formatStageLabel(stage))
  },
  {
    label: 'Subjects willing to teach',
    items: form.subjectsTaught
  },
  {
    label: 'Exam boards familiar with',
    items: form.examBoardsTaught
  }
]);

const setFeedback = (type, message) => {
  feedback.type = type;
  feedback.message = message;
};

const setPasswordFeedback = (type, message) => {
  passwordFeedback.type = type;
  passwordFeedback.message = message;
};

const syncTeachingForm = (user) => {
  form.stagesTaught = [...(user.profile?.stages_taught || [])];
  form.subjectsTaught = [...(user.profile?.subjects_taught || [])];
  form.examBoardsTaught = [...(user.profile?.exam_boards_taught || [])];
};

const syncForm = (user) => {
  profile.value = user;
  form.displayName = user.full_name || '';
  form.phoneNumber = user.phone_number || user.profile?.phone || '';
  form.specialism = user.profile?.specialism || '';
  form.bio = user.profile?.bio || '';
  form.yearGroup = user.profile?.year_group || '';
  form.targetGrade = user.profile?.target_grade || '';
  form.subjectFocus = user.profile?.subject_focus || '';
  form.title = user.profile?.title || '';
  syncTeachingForm(user);
};

const loadProfile = async () => {
  const response = await api.get('/users/me');
  syncForm(response.data.data);
  auth.state.user = response.data.data;
  localStorage.setItem('tutortrack_user', JSON.stringify(response.data.data));
};

const toggleOption = (list, value) => {
  const index = list.indexOf(value);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }
};

const openTeachingEditor = () => {
  syncTeachingForm(profile.value);
  showTeachingEditor.value = true;
};

const cancelTeachingEditor = () => {
  syncTeachingForm(profile.value);
  showTeachingEditor.value = false;
};

const saveProfile = async () => {
  try {
    const response = await api.put('/users/me', form);
    syncForm(response.data.data);
    auth.state.user = response.data.data;
    localStorage.setItem('tutortrack_user', JSON.stringify(response.data.data));
    setFeedback('success', 'Profile updated successfully.');
  } catch (error) {
    setFeedback(
      'error',
      error.response?.data?.message || 'Unable to update profile right now.'
    );
  }
};

const saveTeachingProfile = async () => {
  try {
    const response = await api.put('/users/me', {
      stagesTaught: form.stagesTaught,
      subjectsTaught: form.subjectsTaught,
      examBoardsTaught: form.examBoardsTaught
    });
    syncForm(response.data.data);
    auth.state.user = response.data.data;
    localStorage.setItem('tutortrack_user', JSON.stringify(response.data.data));
    showTeachingEditor.value = false;
    setFeedback('success', 'Teaching profile updated successfully.');
  } catch (error) {
    setFeedback(
      'error',
      error.response?.data?.message || 'Unable to update teaching profile right now.'
    );
  }
};

const changePassword = async () => {
  if (passwordsDoNotMatch.value) {
    setPasswordFeedback('error', 'New password and confirm password do not match.');
    setFeedback('error', 'New password and confirm password do not match.');
    return;
  }

  try {
    await api.put('/users/me/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmNewPassword = '';
    showPasswordForm.value = false;
    setPasswordFeedback('success', 'Password changed successfully.');
    setFeedback('success', 'Password changed successfully.');
  } catch (error) {
    setPasswordFeedback(
      'error',
      error.response?.data?.message || 'Unable to change password right now.'
    );
    setFeedback(
      'error',
      error.response?.data?.message || 'Unable to change password right now.'
    );
  }
};

const createChildAccount = async () => {
  const response = await api.post('/users/me/children', childForm);
  childSignupResult.value = response.data.data;
  Object.assign(childForm, {
    firstName: '',
    surname: '',
    email: '',
    relationshipLabel: 'Guardian',
    yearGroup: '',
    targetGrade: '',
    subjectFocus: '',
    notes: ''
  });
  await loadProfile();
};

const handleLogout = async () => {
  await auth.logout();
  router.push('/login');
};

onMounted(loadProfile);
</script>

<style scoped>
.teaching-section {
  display: grid;
  gap: 10px;
}

.teaching-section-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.teaching-section-block {
  display: grid;
  gap: 8px;
}

.teaching-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.teaching-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.78);
  font-size: 0.95rem;
}

.teaching-edit-section {
  padding-top: 6px;
  display: grid;
  gap: 16px;
}

.teaching-edit-group {
  display: grid;
  gap: 10px;
}

.teaching-edit-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.68);
  font-size: 0.92rem;
  cursor: pointer;
}

.teaching-edit-chip.active {
  border-color: rgba(22, 91, 109, 0.4);
  background: rgba(22, 91, 109, 0.1);
}

.teaching-edit-chip input {
  margin: 0;
}

.teaching-edit-actions {
  margin-top: 4px;
}
</style>
