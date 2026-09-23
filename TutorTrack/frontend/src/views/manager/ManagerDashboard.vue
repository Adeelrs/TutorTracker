<template>
  <div class="stack">
    <div v-if="feedback.message" class="notice" :class="feedback.variant === 'error' ? 'notice-error' : 'notice-success'">
      {{ feedback.message }}
    </div>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="page-eyebrow">Manager dashboard</p>
          <h2>Control centre</h2>
        </div>
      </div>

      <div class="card-grid-four">
        <article class="card metric-card">
          <p class="eyebrow">Tutors assigned</p>
          <h4>{{ assignedTutorCount }}</h4>
          <p class="muted">Tutors currently linked to this manager</p>
        </article>

        <article class="card metric-card">
          <p class="eyebrow">Students</p>
          <h4>{{ studentCount }}</h4>
          <p class="muted">Students currently on the platform</p>
        </article>

        <article class="card metric-card">
          <p class="eyebrow">Parents</p>
          <h4>{{ parents.length }}</h4>
          <p class="muted">Parent accounts available for bookings and messages</p>
        </article>

        <article class="card metric-card">
          <p class="eyebrow">Pending approvals</p>
          <h4>{{ pendingApprovals.length }}</h4>
          <p class="muted">Tutors waiting for a manager decision</p>
        </article>
      </div>
    </section>

    <ManagerTutorApprovalView :tutors="pendingApprovals" @update="updateApproval" />

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Teaching relationships</p>
          <h2>Assign and unassign students for tutors</h2>
        </div>
      </div>

      <div class="split-grid">
        <article class="card">
          <label class="field">
            <span>Select tutor</span>
            <select v-model="selectedTutorId">
              <option value="">Choose tutor</option>
              <option v-for="tutor in approvedTutors" :key="tutor.id" :value="String(tutor.id)">
                {{ tutor.full_name }}
              </option>
            </select>
          </label>

          <div class="status-list list-scroll" style="margin-top: 16px;">
            <div v-for="link in selectedTutorLinks" :key="link.id" class="status-item">
              <div>
                <strong>{{ link.student_name }}</strong>
                <p class="muted">{{ link.year_group || 'Year not set' }} | {{ link.subject_focus || 'No subject focus' }}</p>
              </div>
              <button class="ghost-button" @click="removeTutorStudent(link.id)">Unassign</button>
            </div>
          </div>

          <EmptyState
            v-if="selectedTutorId && !selectedTutorLinks.length"
            title="No students assigned"
            message="This tutor does not have any students linked yet."
          />
        </article>

        <article class="card">
          <div class="filter-row manager-search-row">
            <label class="field">
              <span>Search by ID, name, email, or year</span>
              <input v-model.trim="tutorStudentSearch" placeholder="Search students for assignment" />
            </label>
          </div>

          <div class="status-list list-scroll" style="margin-top: 16px;">
            <div v-for="student in filteredStudentsForTutor" :key="student.id" class="status-item">
              <div>
                <strong>{{ student.full_name }}</strong>
                <p class="muted">{{ student.platform_user_id }} | {{ student.year_group || 'Year not set' }}</p>
                <p class="helper-text">{{ student.email }} | {{ student.subject_focus || 'No subject focus' }}</p>
              </div>
              <button
                class="primary-button"
                :disabled="!selectedTutorId || selectedTutorStudentIds.has(Number(student.id))"
                @click="assignTutorStudent(student.id)"
              >
                {{ selectedTutorStudentIds.has(Number(student.id)) ? 'Assigned' : 'Assign' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Parent-student relationships</p>
          <h2>Link children to parents and assign a tutor</h2>
        </div>
      </div>

      <div class="split-grid">
        <article class="card">
          <label class="field">
            <span>Select parent</span>
            <select v-model="selectedParentId">
              <option value="">Choose parent</option>
              <option v-for="parent in parents" :key="parent.id" :value="String(parent.id)">
                {{ parent.full_name }}
              </option>
            </select>
          </label>

          <div class="status-list list-scroll" style="margin-top: 16px;">
            <div v-for="link in selectedParentLinks" :key="link.id" class="status-item">
              <div>
                <strong>{{ link.student_name }}</strong>
                <p class="muted">{{ link.relationship_label || 'Guardian link' }}</p>
                <p class="helper-text">{{ link.year_group || 'Year not set' }}</p>
              </div>
              <div class="actions-row">
                <button class="secondary-button" @click="openUserDetail(link.student_user_id)">Open student</button>
                <button class="ghost-button" @click="deleteStudent(link.student_user_id)">Delete</button>
              </div>
            </div>
          </div>

          <EmptyState
            v-if="selectedParentId && !selectedParentLinks.length"
            title="No linked children"
            message="This parent does not have any students linked yet."
          />
        </article>

        <article class="card">
          <form class="form-grid two-column" @submit.prevent="addParentStudent">
            <label class="field">
              <span>Student</span>
              <select v-model="parentStudentForm.studentUserId" :disabled="!selectedParentId" required>
                <option value="">Select student</option>
                <option v-for="student in availableStudentsForParent" :key="student.id" :value="String(student.id)">
                  {{ student.full_name }} - {{ student.platform_user_id }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Relationship label</span>
              <select v-model="parentStudentForm.relationshipLabel" :disabled="!selectedParentId" required>
                <option value="">Choose relationship</option>
                <option v-for="relationship in relationshipLabelOptions" :key="relationship" :value="relationship">
                  {{ relationship }}
                </option>
              </select>
              <p v-if="parentStudentErrors.relationshipLabel" class="field-error">{{ parentStudentErrors.relationshipLabel }}</p>
            </label>

            <label class="field" style="grid-column: 1 / -1;">
              <span>Assign tutor at the same time</span>
              <select v-model="parentStudentForm.tutorUserId" :disabled="!selectedParentId" required>
                <option value="">Choose tutor</option>
                <option v-for="tutor in approvedTutors" :key="tutor.id" :value="String(tutor.id)">
                  {{ tutor.full_name }}
                </option>
              </select>
              <p v-if="parentStudentErrors.tutorUserId" class="field-error">{{ parentStudentErrors.tutorUserId }}</p>
            </label>

            <div class="actions-row" style="grid-column: 1 / -1;">
              <button class="primary-button" :disabled="!canSubmitParentStudentLink">Add child to parent</button>
              <button class="secondary-button" type="button" @click="toggleCreateStudentForm">
                {{ showCreateStudentForm ? 'Cancel new student' : 'Create new student' }}
              </button>
            </div>
          </form>

          <form
            v-if="showCreateStudentForm"
            class="form-grid two-column manager-inline-form"
            @submit.prevent="createStudentFromManager"
          >
            <label class="field">
              <span>Full name</span>
              <input v-model.trim="createStudentForm.fullName" placeholder="Student full name" required />
              <p v-if="createStudentErrors.fullName" class="field-error">{{ createStudentErrors.fullName }}</p>
            </label>

            <label class="field">
              <span>Email</span>
              <input v-model.trim="createStudentForm.email" type="email" placeholder="student@example.com" required />
              <p v-if="createStudentErrors.email" class="field-error">{{ createStudentErrors.email }}</p>
            </label>

            <label class="field">
              <span>Year group</span>
              <select v-model="createStudentForm.yearGroup" required>
                <option value="">Choose year group</option>
                <option v-for="yearGroup in yearGroupOptions" :key="yearGroup" :value="yearGroup">
                  {{ yearGroup }}
                </option>
              </select>
              <p v-if="createStudentErrors.yearGroup" class="field-error">{{ createStudentErrors.yearGroup }}</p>
            </label>

            <label class="field">
              <span>Subject focus</span>
              <select v-model="createStudentForm.subjectFocus" required>
                <option value="">Choose subject</option>
                <option v-for="subject in subjectFocusOptions" :key="subject" :value="subject">
                  {{ subject }}
                </option>
              </select>
              <p v-if="createStudentErrors.subjectFocus" class="field-error">{{ createStudentErrors.subjectFocus }}</p>
            </label>

            <div class="actions-row" style="grid-column: 1 / -1;">
              <button class="primary-button">Create student</button>
              <button class="ghost-button" type="button" @click="cancelCreateStudent">Cancel</button>
            </div>
          </form>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Platform users</p>
          <h2>Search, filter, and open any user dashboard</h2>
        </div>
      </div>

      <div class="filter-row platform-user-filters">
        <label class="field">
          <span>Search</span>
          <input v-model="userFilters.search" placeholder="Name, email, platform ID or profile highlight" />
        </label>

        <label class="field">
          <span>Role</span>
          <select v-model="userFilters.role">
            <option value="">All roles</option>
            <option value="manager">Manager</option>
            <option value="tutor">Tutor</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </label>

        <label class="field">
          <span>Status</span>
          <select v-model="userFilters.status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      <div style="margin-top: 18px;">
        <ManagerUsersView :users="users" @select="openUserDetail" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../services/authStore';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState.vue';
import ManagerTutorApprovalView from '../../components/ManagerTutorApprovalView.vue';
import ManagerUsersView from '../../components/ManagerUsersView.vue';

const router = useRouter();
const auth = useAuthStore();

const feedback = ref({ message: '', variant: 'success' });
const loadError = ref('');
const approvals = ref([]);
const tutors = ref([]);
const parents = ref([]);
const students = ref([]);
const users = ref([]);
const tutorStudentLinks = ref([]);
const parentStudentLinks = ref([]);
const selectedTutorId = ref('');
const selectedParentId = ref('');
const tutorStudentSearch = ref('');
const showCreateStudentForm = ref(false);

const yearGroupOptions = [
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

const subjectFocusOptions = [
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

const relationshipLabelOptions = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Carer'];
const namePattern = /^[A-Za-z]+(?:[A-Za-z' -]*[A-Za-z])$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userFilters = reactive({
  search: '',
  role: '',
  status: ''
});
let userFilterTimer = null;
let userLoadRequestId = 0;

const parentStudentForm = reactive({
  studentUserId: '',
  relationshipLabel: '',
  tutorUserId: ''
});

const createStudentForm = reactive({
  fullName: '',
  email: '',
  yearGroup: '',
  subjectFocus: ''
});

const createStudentErrors = reactive({
  fullName: '',
  email: '',
  yearGroup: '',
  subjectFocus: ''
});

const parentStudentErrors = reactive({
  relationshipLabel: '',
  tutorUserId: ''
});

const pendingApprovals = computed(() =>
  (approvals.value.length ? approvals.value : tutors.value).filter((item) => item.approval_status === 'pending')
);

const approvedTutors = computed(() =>
  tutors.value.filter((tutor) => String(tutor.approval_status || '').toLowerCase() === 'approved')
);

const studentCount = computed(() =>
  new Set(students.value.map((student) => Number(student.id)).filter(Boolean)).size
);

const assignedTutorCount = computed(() => {
  const currentManagerId = Number(auth.state.user?.id || 0);
  const linkedApprovedTutors = approvedTutors.value.filter(
    (tutor) => Number(tutor.manager_user_id || 0) === currentManagerId
  );

  return linkedApprovedTutors.length || approvedTutors.value.length;
});

const selectedTutorLinks = computed(() =>
  tutorStudentLinks.value.filter((link) => String(link.tutor_user_id) === String(selectedTutorId.value))
);

const selectedTutorStudentIds = computed(() =>
  new Set(selectedTutorLinks.value.map((link) => Number(link.student_user_id)))
);

const filteredStudentsForTutor = computed(() => {
  const term = tutorStudentSearch.value.trim().toLowerCase();
  const unassignedStudents = students.value.filter(
    (student) => !selectedTutorStudentIds.value.has(Number(student.id))
  );

  if (!term) {
    return unassignedStudents;
  }

  return unassignedStudents.filter((student) =>
    [
      student.platform_user_id,
      student.full_name,
      student.email,
      student.year_group
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  );
});

const selectedParentLinks = computed(() =>
  parentStudentLinks.value.filter((link) => String(link.parent_user_id) === String(selectedParentId.value))
);

const selectedParentStudentIds = computed(() =>
  new Set(selectedParentLinks.value.map((link) => Number(link.student_user_id)))
);

const guardianCountsByStudent = computed(() =>
  parentStudentLinks.value.reduce((counts, link) => {
    const studentId = Number(link.student_user_id);

    if (!studentId) {
      return counts;
    }

    counts.set(studentId, (counts.get(studentId) || 0) + 1);
    return counts;
  }, new Map())
);

const availableStudentsForParent = computed(() =>
  students.value.filter((student) => {
    const studentId = Number(student.id);
    const guardianCount = guardianCountsByStudent.value.get(studentId) || 0;

    return !selectedParentStudentIds.value.has(studentId) && guardianCount < 2;
  })
);

const canSubmitParentStudentLink = computed(() =>
  Boolean(
    selectedParentId.value &&
    parentStudentForm.studentUserId &&
    parentStudentForm.relationshipLabel &&
    parentStudentForm.tutorUserId
  )
);

const clearCreateStudentErrors = () => {
  createStudentErrors.fullName = '';
  createStudentErrors.email = '';
  createStudentErrors.yearGroup = '';
  createStudentErrors.subjectFocus = '';
};

const clearParentStudentErrors = () => {
  parentStudentErrors.relationshipLabel = '';
  parentStudentErrors.tutorUserId = '';
};

const validateCreateStudentForm = () => {
  clearCreateStudentErrors();

  if (!createStudentForm.fullName || !namePattern.test(createStudentForm.fullName)) {
    createStudentErrors.fullName = 'Enter a valid student name using letters, spaces, hyphens, or apostrophes.';
  }

  if (!createStudentForm.email || !emailPattern.test(createStudentForm.email)) {
    createStudentErrors.email = 'Enter a valid student email address.';
  }

  if (!yearGroupOptions.includes(createStudentForm.yearGroup)) {
    createStudentErrors.yearGroup = 'Choose a valid year group.';
  }

  if (!subjectFocusOptions.includes(createStudentForm.subjectFocus)) {
    createStudentErrors.subjectFocus = 'Choose a valid subject focus.';
  }

  return !Object.values(createStudentErrors).some(Boolean);
};

const validateParentStudentForm = () => {
  clearParentStudentErrors();

  if (!relationshipLabelOptions.includes(parentStudentForm.relationshipLabel)) {
    parentStudentErrors.relationshipLabel = 'Choose a valid relationship label.';
  }

  if (!parentStudentForm.tutorUserId) {
    parentStudentErrors.tutorUserId = 'Assign an approved tutor before saving this child.';
  }

  return !Object.values(parentStudentErrors).some(Boolean);
};

const loadUsers = async () => {
  const requestId = ++userLoadRequestId;
  const response = await api.get('/users', { params: userFilters });

  if (requestId !== userLoadRequestId) {
    return;
  }

  users.value = response.data.data || [];
};

const scheduleUserLoad = (delay = 0) => {
  if (userFilterTimer) {
    clearTimeout(userFilterTimer);
  }

  userFilterTimer = setTimeout(() => {
    loadUsers();
  }, delay);
};

const loadRelationships = async () => {
  const [tutorStudentResponse, parentStudentResponse] = await Promise.all([
    api.get('/relationships/tutor-students'),
    api.get('/relationships/parent-students')
  ]);

  tutorStudentLinks.value = tutorStudentResponse.data.data || [];
  parentStudentLinks.value = parentStudentResponse.data.data || [];
};

const loadDashboardData = async () => {
  loadError.value = '';

  const [tutorsResult, parentsResult, studentsResult, approvalsResult] = await Promise.allSettled([
    api.get('/tutors', { params: { includeAll: true } }),
    api.get('/parents'),
    api.get('/students'),
    api.get('/manager/tutor-approvals')
  ]);

  const failures = [];

  if (tutorsResult.status === 'fulfilled') {
    tutors.value = tutorsResult.value.data.data || [];
  } else {
    tutors.value = [];
    failures.push(tutorsResult.reason?.response?.data?.message || tutorsResult.reason?.message || 'Tutors could not be loaded.');
  }

  if (parentsResult.status === 'fulfilled') {
    parents.value = parentsResult.value.data.data || [];
  } else {
    parents.value = [];
    failures.push(parentsResult.reason?.response?.data?.message || parentsResult.reason?.message || 'Parents could not be loaded.');
  }

  if (studentsResult.status === 'fulfilled') {
    students.value = studentsResult.value.data.data || [];
  } else {
    students.value = [];
    failures.push(studentsResult.reason?.response?.data?.message || studentsResult.reason?.message || 'Students could not be loaded.');
  }

  if (approvalsResult.status === 'fulfilled') {
    approvals.value = approvalsResult.value.data.data || [];
  } else {
    approvals.value = [];
    failures.push(approvalsResult.reason?.response?.data?.message || approvalsResult.reason?.message || 'Tutor approvals could not be loaded.');
  }

  try {
    await Promise.all([loadUsers(), loadRelationships()]);
  } catch (error) {
    failures.push(error.response?.data?.message || error.message || 'Additional manager data could not be loaded.');
  }

  if (failures.length) {
    loadError.value = failures[0];
  }
};

const updateApproval = async (tutorId, approvalStatus) => {
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.put(`/manager/tutors/${tutorId}/approval`, { approvalStatus });
    feedback.value = { message: 'Tutor approval updated successfully.', variant: 'success' };
    await loadDashboardData();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Tutor approval could not be updated.',
      variant: 'error'
    };
  }
};

const assignTutorStudent = async (studentUserId) => {
  if (!selectedTutorId.value) {
    return;
  }

  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/relationships/tutor-students', {
      tutorUserId: Number(selectedTutorId.value),
      studentUserId: Number(studentUserId)
    });
    feedback.value = { message: 'Student assigned to tutor successfully.', variant: 'success' };
    await loadRelationships();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Student could not be assigned right now.',
      variant: 'error'
    };
  }
};

const removeTutorStudent = async (relationshipId) => {
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.delete(`/relationships/tutor-students/${relationshipId}`);
    feedback.value = { message: 'Tutor-student link removed successfully.', variant: 'success' };
    await loadRelationships();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Tutor-student link could not be removed.',
      variant: 'error'
    };
  }
};

const resetCreateStudentForm = () => {
  createStudentForm.fullName = '';
  createStudentForm.email = '';
  createStudentForm.yearGroup = '';
  createStudentForm.subjectFocus = '';
  clearCreateStudentErrors();
};

const cancelCreateStudent = () => {
  resetCreateStudentForm();
  showCreateStudentForm.value = false;
};

const toggleCreateStudentForm = () => {
  if (showCreateStudentForm.value) {
    cancelCreateStudent();
    return;
  }

  showCreateStudentForm.value = true;
};

const createStudentFromManager = async () => {
  feedback.value = { message: '', variant: 'success' };

  if (!validateCreateStudentForm()) {
    feedback.value = {
      message: 'Please correct the student details before creating the account.',
      variant: 'error'
    };
    return;
  }

  try {
    const response = await api.post('/users/students', {
      fullName: createStudentForm.fullName,
      email: createStudentForm.email,
      yearGroup: createStudentForm.yearGroup || null,
      subjectFocus: createStudentForm.subjectFocus || null
    });

    const createdStudent = response.data.data?.studentUser || null;
    const temporaryPassword = response.data.data?.temporaryPassword || '';

    await loadDashboardData();

    if (createdStudent?.id) {
      parentStudentForm.studentUserId = String(createdStudent.id);
    }

    feedback.value = {
      message: temporaryPassword
        ? `Student created successfully. Temporary password: ${temporaryPassword}`
        : 'Student created successfully.',
      variant: 'success'
    };

    cancelCreateStudent();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Student could not be created right now.',
      variant: 'error'
    };
  }
};

const addParentStudent = async () => {
  if (!selectedParentId.value || !parentStudentForm.studentUserId) {
    return;
  }

  feedback.value = { message: '', variant: 'success' };

  if (!validateParentStudentForm()) {
    feedback.value = {
      message: 'Choose a relationship label and an approved tutor before saving this child.',
      variant: 'error'
    };
    return;
  }

  try {
    await api.post('/relationships/parent-students', {
      parentUserId: Number(selectedParentId.value),
      studentUserId: Number(parentStudentForm.studentUserId),
      relationshipLabel: parentStudentForm.relationshipLabel,
      tutorUserId: Number(parentStudentForm.tutorUserId)
    });

    parentStudentForm.studentUserId = '';
    parentStudentForm.relationshipLabel = '';
    parentStudentForm.tutorUserId = '';
    clearParentStudentErrors();
    feedback.value = { message: 'Parent, student, and tutor link saved successfully.', variant: 'success' };
    await loadRelationships();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Parent-student link could not be saved.',
      variant: 'error'
    };
  }
};

const deleteStudent = async (studentUserId) => {
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.delete(`/users/${studentUserId}`);
    feedback.value = { message: 'Student deleted successfully.', variant: 'success' };
    await loadDashboardData();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Student could not be deleted.',
      variant: 'error'
    };
  }
};

const openUserDetail = (userId) => {
  router.push(`/app/manager/users/${userId}`);
};

watch(
  () => userFilters.search,
  () => {
    scheduleUserLoad(250);
  }
);

watch(
  () => [userFilters.role, userFilters.status],
  () => {
    scheduleUserLoad(0);
  }
);

onBeforeUnmount(() => {
  if (userFilterTimer) {
    clearTimeout(userFilterTimer);
  }
});

onMounted(loadDashboardData);
</script>

<style scoped>
.manager-search-row {
  margin-bottom: 0;
}

.metric-card {
  display: grid;
  gap: 8px;
}

.manager-inline-form {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.field-error {
  margin-top: 6px;
  color: var(--danger, #b13a3a);
  font-size: 0.9rem;
}

.platform-user-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .platform-user-filters {
    grid-template-columns: 1fr;
  }
}
</style>
