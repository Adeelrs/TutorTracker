<template>
  <div class="stack">
    <div v-if="feedback.message" class="notice" :class="feedback.variant === 'error' ? 'notice-error' : 'notice-success'">
      {{ feedback.message }}
    </div>

    <div v-if="loadError" class="notice notice-error">
      {{ loadError }}
    </div>

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="!detail.id"
      title="User detail not found"
      message="This user record could not be loaded right now."
    />

    <template v-else>
      <section class="panel">
        <div class="section-header">
          <div>
            <p class="page-eyebrow">Manager user view</p>
            <h2>{{ detail.full_name }}</h2>
          </div>
          <button type="button" class="ghost-button" @click="navigateFromManagerDetail('/app/manager/dashboard')">
            Back to dashboard
          </button>
        </div>
        <p class="muted">
          Open the user’s working view below, while keeping manager-only edit and relationship controls at the top.
        </p>
      </section>

      <section class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Manager controls</p>
            <h3>Edit {{ detail.role }} details</h3>
          </div>
          <UserBadge :text="detail.role" />
        </div>

        <form class="form-grid two-column" @submit.prevent="saveUser">
          <label class="field">
            <span>Platform user ID</span>
            <input :value="detail.platform_user_id || 'Not assigned'" disabled />
          </label>

          <label class="field">
            <span>Account status</span>
            <select v-model="form.accountStatus">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label class="field">
            <span>Full name</span>
            <input v-model="form.fullName" required />
          </label>

          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" required />
          </label>

          <label class="field" :style="phoneFieldStyle">
            <span>{{ detail.role === 'student' ? 'Phone number (optional)' : 'Phone number' }}</span>
            <input
              v-model="form.phoneNumber"
              inputmode="numeric"
              pattern="[0-9]*"
              @input="form.phoneNumber = sanitizePhoneNumber(form.phoneNumber)"
            />
          </label>

          <template v-if="detail.role === 'tutor'">
            <label class="field">
              <span>Specialism</span>
              <input v-model="form.specialism" placeholder="Tutor specialism" />
            </label>

            <label class="field" style="grid-column: 1 / -1;">
              <span>Bio</span>
              <textarea v-model="form.bio" rows="4" placeholder="Tutor biography"></textarea>
            </label>
          </template>

          <template v-else-if="detail.role === 'student'">
            <label class="field">
              <span>Year group</span>
              <select v-model="form.yearGroup">
                <option value="">Choose year group</option>
                <option v-for="yearGroup in yearGroupOptions" :key="yearGroup" :value="yearGroup">
                  {{ yearGroup }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Target grade</span>
              <input v-model="form.targetGrade" placeholder="Target grade" />
            </label>

            <label class="field">
              <span>Subject focus</span>
              <input v-model="form.subjectFocus" placeholder="Subject focus" />
            </label>

            <label class="field" style="grid-column: 1 / -1;">
              <span>Notes</span>
              <textarea v-model="form.notes" rows="4" placeholder="Student notes"></textarea>
            </label>
          </template>

          <template v-else-if="detail.role === 'parent'">
            <label class="field" style="grid-column: 1 / -1;">
              <span>Notes</span>
              <textarea v-model="form.notes" rows="4" placeholder="Parent notes"></textarea>
            </label>
          </template>

          <template v-else-if="detail.role === 'manager'">
            <label class="field">
              <span>Title</span>
              <input v-model="form.title" placeholder="Manager title" />
            </label>
          </template>

          <div class="actions-row" style="grid-column: 1 / -1;">
            <button class="primary-button" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save user details' }}
            </button>
          </div>
        </form>
      </section>

      <template v-if="detail.role === 'tutor'">
        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Tutor dashboard view</p>
              <h3>Student assignment tools</h3>
            </div>
            <UserBadge :text="detail.approval_status || 'pending'" :variant="approvalVariant(detail.approval_status)" />
          </div>

          <div class="detail-rows">
            <div class="detail-row">
              <span>Approval status</span>
              <strong class="detail-value">{{ detail.approval_status || 'Pending' }}</strong>
            </div>
            <div class="detail-row">
              <span>Assigned manager</span>
              <strong class="detail-value">{{ detail.managerInfo?.full_name || 'Not assigned' }}</strong>
            </div>
            <div class="detail-row">
              <span>Assigned students</span>
              <strong class="detail-value">{{ detail.assignedStudents?.length || 0 }}</strong>
            </div>
          </div>

          <div class="split-grid manager-detail-grid" style="margin-top: 18px;">
            <article class="card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Assigned students</p>
                  <h4>{{ detail.assignedStudents?.length || 0 }} linked student{{ detail.assignedStudents?.length === 1 ? '' : 's' }}</h4>
                </div>
              </div>

              <EmptyState
                v-if="!detail.assignedStudents?.length"
                title="No assigned students"
                message="Use the search panel to assign students to this tutor."
              />

              <div v-else class="status-list list-scroll">
                <div v-for="student in detail.assignedStudents" :key="student.user_id" class="status-item">
                  <div>
                    <strong>{{ student.full_name }}</strong>
                    <p class="muted">{{ student.platform_user_id || 'No platform ID' }} | {{ student.year_group || 'Year not set' }}</p>
                    <p class="helper-text">{{ student.subject_focus || 'No subject focus' }}</p>
                  </div>
                  <div class="actions-row">
                    <button class="secondary-button compact-button" @click="openUser(student.user_id)">View student</button>
                    <button class="ghost-button compact-button" :disabled="relationshipBusy" @click="removeTutorStudent(student.user_id)">
                      Unassign
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article class="card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Assign students</p>
                  <h4>Search by ID, name, email, or year</h4>
                </div>
              </div>

              <label class="field">
                <span>Search students</span>
                <input v-model.trim="tutorStudentSearch" placeholder="Search available students" />
              </label>

              <div class="status-list list-scroll" style="margin-top: 16px;">
                <div v-for="student in filteredTutorStudents" :key="student.id" class="status-item">
                  <div>
                    <strong>{{ student.full_name }}</strong>
                    <p class="muted">{{ student.platform_user_id || 'No platform ID' }} | {{ student.year_group || 'Year not set' }}</p>
                    <p class="helper-text">{{ student.email }} | {{ student.subject_focus || 'No subject focus' }}</p>
                  </div>
                  <button
                    class="primary-button compact-button"
                    :disabled="relationshipBusy"
                    @click="assignTutorStudent(student.id)"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Sessions</p>
              <h3>Requested, upcoming, and previous sessions</h3>
            </div>
          </div>

          <div class="stack">
            <section class="session-subsection">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Requested sessions</p>
                  <h4>{{ tutorRequestedBookings.length }} waiting for action</h4>
                </div>
              </div>

              <EmptyState
                v-if="!tutorRequestedBookings.length"
                title="No requested sessions"
                message="Pending booking requests will appear here."
              />

              <div v-else class="table-wrap table-scroll dashboard-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student</th>
                      <th>Parent</th>
                      <th>Subject</th>
                      <th>Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="booking in tutorRequestedBookings" :key="booking.id">
                      <td>{{ formatDate(booking.booking_date) }}</td>
                      <td>{{ formatTime(booking.start_time) }}</td>
                      <td>{{ booking.student_name || 'Student' }}</td>
                      <td>{{ booking.parent_name || 'No linked parent' }}</td>
                      <td>{{ booking.subject || 'General' }}</td>
                      <td>{{ booking.duration_minutes }} mins</td>
                      <td class="dashboard-actions-cell">
                        <div class="dashboard-actions">
                          <button class="primary-button compact-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'confirmed')">
                            Accept
                          </button>
                          <button class="ghost-button compact-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'cancelled')">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="session-subsection">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Upcoming sessions</p>
                  <h4>{{ tutorUpcomingBookings.length }} confirmed future sessions</h4>
                </div>
              </div>

              <EmptyState
                v-if="!tutorUpcomingBookings.length"
                title="No upcoming sessions"
                message="Confirmed future sessions will appear here."
              />

              <div v-else class="table-wrap table-scroll dashboard-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student ID</th>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>Exam board</th>
                      <th>Status</th>
                      <th>Actions</th>
                      <th>View student</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="booking in tutorUpcomingBookings" :key="booking.id">
                      <td>{{ formatDate(booking.booking_date) }}</td>
                      <td>{{ formatTime(booking.start_time) }}</td>
                      <td>{{ booking.student_platform_user_id || 'Not assigned' }}</td>
                      <td>{{ booking.student_name || 'Student' }}</td>
                      <td>{{ booking.subject || 'General' }}</td>
                      <td>{{ booking.exam_board || 'General' }}</td>
                      <td><UserBadge :text="booking.status" :variant="statusVariant(booking.status)" /></td>
                      <td class="dashboard-action-cell">
                        <button class="ghost-button compact-button manager-action-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'cancelled')">
                          Cancel
                        </button>
                      </td>
                      <td class="dashboard-action-cell">
                        <button class="secondary-button compact-button manager-action-button" @click="openUser(booking.student_user_id)">View student</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="session-subsection">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Previous sessions</p>
                  <h4>{{ tutorPreviousEntries.length }} past sessions and report tasks</h4>
                </div>
              </div>

              <EmptyState
                v-if="!tutorPreviousEntries.length"
                title="No previous sessions"
                message="Past sessions and report actions will appear here."
              />

              <div v-else class="table-wrap table-scroll dashboard-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>Attendance</th>
                      <th>Status</th>
                      <th>Actions</th>
                      <th>View student</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="entry in tutorPreviousEntries" :key="entry.key">
                      <td>{{ entry.dateLabel }}</td>
                      <td>{{ entry.timeLabel }}</td>
                      <td>{{ entry.student_name || 'Student' }}</td>
                      <td>{{ entry.subject }}</td>
                      <td><UserBadge :text="entry.attendanceLabel" :variant="entry.attendanceVariant" /></td>
                      <td><UserBadge :text="entry.statusLabel" :variant="entry.statusVariant" /></td>
                      <td class="dashboard-action-cell">
                        <button class="secondary-button compact-button manager-action-button" @click="openReportEntry(entry)">
                          {{ entry.type === 'session' ? 'Report' : 'Create report' }}
                        </button>
                      </td>
                      <td class="dashboard-action-cell">
                        <button class="ghost-button compact-button manager-action-button" @click="openUser(entry.student_user_id)">View student</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </template>

      <template v-else-if="detail.role === 'parent'">
        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Parent dashboard view</p>
              <h3>Linked children and assignment tools</h3>
            </div>
          </div>

          <div class="split-grid manager-detail-grid">
            <article class="card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Linked children</p>
                  <h4>{{ detail.linkedChildren?.length || 0 }} linked child{{ detail.linkedChildren?.length === 1 ? '' : 'ren' }}</h4>
                </div>
              </div>

              <EmptyState
                v-if="!detail.linkedChildren?.length"
                title="No linked children"
                message="Use the add-child form to connect students to this parent."
              />

              <div v-else class="status-list list-scroll">
                <div v-for="child in detail.linkedChildren" :key="child.user_id" class="status-item">
                  <div>
                    <strong>{{ child.full_name }}</strong>
                    <p class="muted">{{ child.platform_user_id || 'No platform ID' }} | {{ child.year_group || 'Year not set' }}</p>
                    <p class="helper-text">{{ child.relationship_label || 'Guardian link' }}</p>
                  </div>
                  <div class="actions-row">
                    <button class="secondary-button compact-button" @click="openUser(child.user_id)">View student</button>
                    <button class="ghost-button compact-button" :disabled="relationshipBusy" @click="removeParentStudent(child.user_id)">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article class="card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Add child</p>
                  <h4>Link a student and assign a tutor</h4>
                </div>
              </div>

              <form class="form-grid two-column" @submit.prevent="addParentStudent">
                <label class="field">
                  <span>Student</span>
                  <select v-model="parentStudentForm.studentUserId" required>
                    <option value="">Select student</option>
                    <option v-for="student in availableStudentsForParent" :key="student.id" :value="String(student.id)">
                      {{ student.full_name }} - {{ student.platform_user_id || 'No platform ID' }}
                    </option>
                  </select>
                </label>

                <label class="field">
                  <span>Relationship label</span>
                  <input v-model="parentStudentForm.relationshipLabel" placeholder="Mother, Father, Guardian" />
                </label>

                <label class="field" style="grid-column: 1 / -1;">
                  <span>Assign tutor</span>
                  <select v-model="parentStudentForm.tutorUserId" required>
                    <option value="">Choose tutor</option>
                    <option v-for="tutor in approvedTutors" :key="tutor.id" :value="String(tutor.id)">
                      {{ tutor.full_name }}
                    </option>
                  </select>
                </label>

                <div class="actions-row" style="grid-column: 1 / -1;">
                  <button class="primary-button" :disabled="relationshipBusy">Save parent-student link</button>
                </div>
              </form>
            </article>
          </div>
        </section>

        <ParentDashboardContent
          :linked-children="linkedChildrenForDashboard"
          :tutors="approvedTutors"
          :selected-student-id="selectedChildId"
          :selected-bookings="selectedChildBookings"
          :selected-dashboard="selectedChildDashboard"
          :selected-sessions="selectedChildSessions"
          :booking-saving="bookingSaving"
          session-base-path="/app/manager/sessions"
          :session-route-query="managerParentSessionRouteQuery"
          force-hard-navigation
          @create-booking="createManagerParentBooking"
          @select-child="selectChild"
          @view-booking-report="viewManagerParentBookingReport"
          @request-booking-report="requestManagerParentBookingReport"
          @message-tutor="messageTutorAboutManagerParentBooking"
        />
      </template>

      <template v-else-if="detail.role === 'student'">
        <EmptyState
          v-if="!managerStudentDashboardData.student"
          title="Student dashboard not available"
          message="The shared student view could not be loaded for this manager page right now."
        />

        <StudentSessionOverview
          v-else
          :dashboard-data="managerStudentDashboardData"
          :sessions="managerStudentSafeSessions"
          session-base-path="/app/manager/sessions"
          :route-query="{ userId: String(detail.id) }"
          force-hard-navigation
        />

        <section v-if="studentBookingsNeedingReports.length" class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Report actions</p>
              <h3>Past bookings without a report</h3>
            </div>
          </div>

          <div class="table-wrap table-scroll dashboard-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Tutor</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="booking in studentBookingsNeedingReports" :key="booking.id">
                  <td>{{ formatDate(booking.booking_date) }}</td>
                  <td>{{ formatTime(booking.start_time) }}</td>
                  <td>{{ booking.tutor_name || 'Tutor' }}</td>
                  <td>{{ booking.subject || 'General' }}</td>
                  <td><UserBadge :text="booking.status" :variant="statusVariant(booking.status)" /></td>
                  <td>
                    <button
                      type="button"
                      class="secondary-button compact-button manager-action-button"
                      @click="navigateFromManagerDetail(buildManagerCreateReportRoute(booking.id))"
                    >
                      Create report
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <section v-else class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Manager dashboard view</p>
            <h3>Manager account summary</h3>
          </div>
        </div>

        <div class="detail-rows">
          <div class="detail-row">
            <span>Platform user ID</span>
            <strong class="detail-value">{{ detail.platform_user_id || 'Not assigned' }}</strong>
          </div>
          <div class="detail-row">
            <span>Email</span>
            <strong class="detail-value">{{ detail.email }}</strong>
          </div>
          <div class="detail-row">
            <span>Phone number</span>
            <strong class="detail-value">{{ detail.phone_number || 'Not provided' }}</strong>
          </div>
          <div class="detail-row">
            <span>Title</span>
            <strong class="detail-value">{{ detail.title || 'Manager' }}</strong>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import EmptyState from '../../components/EmptyState.vue';
import UserBadge from '../../components/UserBadge.vue';
import ParentDashboardContent from '../../components/ParentDashboardContent.vue';
import StudentSessionOverview from '../../components/StudentSessionOverview.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const bookingSaving = ref(false);
const relationshipBusy = ref(false);
const bookingActionId = ref(null);
const loadError = ref('');
const feedback = ref({ message: '', variant: 'success' });
const detail = ref({});
const students = ref([]);
const tutors = ref([]);
const selectedChildDashboard = ref({});
const selectedChildSessions = ref([]);
const selectedChildBookings = ref([]);
const managerViewedStudentDashboard = ref({});
const managerViewedStudentSessions = ref([]);
const tutorStudentSearch = ref('');
const selectedChildId = ref('');
const managerStudentSelectedSubject = ref('all');
const managerStudentActiveGuardianIndex = ref(0);
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

const form = reactive({
  fullName: '',
  email: '',
  phoneNumber: '',
  accountStatus: 'active',
  bio: '',
  specialism: '',
  yearGroup: '',
  targetGrade: '',
  subjectFocus: '',
  notes: '',
  title: ''
});

const parentStudentForm = reactive({
  studentUserId: '',
  relationshipLabel: '',
  tutorUserId: ''
});

const studentDashboardData = computed(() => ({
  student: detail.value,
  guardians: detail.value.guardians || []
}));

const linkedChildrenForDashboard = computed(() =>
  (detail.value.linkedChildren || []).map((child) => ({
    id: child.user_id,
    platform_user_id: child.platform_user_id,
    full_name: child.full_name,
    year_group: child.year_group,
    subject_focus: child.subject_focus
  }))
);

const managerParentSessionRouteQuery = computed(() =>
  selectedChildId.value
    ? {
        userId: String(detail.value.id),
        studentUserId: String(selectedChildId.value)
      }
    : {
        userId: String(detail.value.id)
      }
);

const managerStudentDashboardData = computed(() =>
  managerViewedStudentDashboard.value?.student
    ? managerViewedStudentDashboard.value
    : studentDashboardData.value
);

const managerStudent = computed(() =>
  managerStudentDashboardData.value?.student && typeof managerStudentDashboardData.value.student === 'object'
    ? managerStudentDashboardData.value.student
    : {}
);

const managerStudentGuardians = computed(() =>
  Array.isArray(managerStudentDashboardData.value?.guardians)
    ? managerStudentDashboardData.value.guardians.filter((guardian) => guardian && typeof guardian === 'object').slice(0, 2)
    : []
);

const managerStudentActiveGuardian = computed(() => {
  if (!managerStudentGuardians.value.length) {
    return {};
  }

  const safeIndex = Math.min(managerStudentActiveGuardianIndex.value, managerStudentGuardians.value.length - 1);
  return managerStudentGuardians.value[safeIndex] || {};
});

const managerStudentSafeSessions = computed(() => {
  const sourceSessions = managerViewedStudentSessions.value.length
    ? managerViewedStudentSessions.value
    : (detail.value.sessions || []);

  return Array.isArray(sourceSessions)
    ? sourceSessions.filter((session) => session && typeof session === 'object')
    : [];
});

const managerStudentVisibleSessionsAll = computed(() =>
  [...managerStudentSafeSessions.value].sort((left, right) => parseSessionTimestamp(right.session_date) - parseSessionTimestamp(left.session_date))
);

const managerStudentSubjects = computed(() => {
  const subjectNames = [
    ...extractLearningSubjects(managerStudent.value?.subject_focus),
    ...managerStudentSafeSessions.value.flatMap((session) => resolveLearningSessionSubjects(session))
  ];

  const uniqueNames = [...new Set(subjectNames.filter(Boolean))];

  return uniqueNames.map((name, index) => ({
    name,
    count: managerStudentSafeSessions.value.filter((session) => sessionMatchesLearningSubject(session, name, managerStudent.value?.subject_focus)).length,
    color: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
  }));
});

const managerStudentVisibleSessions = computed(() => {
  if (managerStudentSelectedSubject.value === 'all') {
    return managerStudentVisibleSessionsAll.value;
  }

  return managerStudentVisibleSessionsAll.value.filter((session) =>
    sessionMatchesLearningSubject(session, managerStudentSelectedSubject.value, managerStudent.value?.subject_focus)
  );
});

const approvedTutors = computed(() =>
  tutors.value.filter((tutor) => String(tutor.approval_status || '').toLowerCase() === 'approved')
);

const assignedTutorStudentIds = computed(() =>
  new Set((detail.value.assignedStudents || []).map((student) => Number(student.user_id)))
);

const filteredTutorStudents = computed(() => {
  const term = tutorStudentSearch.value.trim().toLowerCase();
  const unassignedStudents = students.value.filter(
    (student) => !assignedTutorStudentIds.value.has(Number(student.id))
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

const availableStudentsForParent = computed(() => {
  const linkedIds = new Set((detail.value.linkedChildren || []).map((child) => Number(child.user_id)));
  return students.value.filter((student) => !linkedIds.has(Number(student.id)));
});

const tutorRequestedBookings = computed(() =>
  (detail.value.bookings || [])
    .filter((booking) => String(booking.status || '').toLowerCase() === 'pending')
    .sort((left, right) => buildBookingTimestamp(left) - buildBookingTimestamp(right))
);

const tutorUpcomingBookings = computed(() =>
  (detail.value.bookings || [])
    .filter((booking) => {
      const status = String(booking.status || '').toLowerCase();
      return status === 'confirmed' && buildBookingTimestamp(booking) >= Date.now();
    })
    .sort((left, right) => buildBookingTimestamp(left) - buildBookingTimestamp(right))
);

const tutorReportedBookingIds = computed(() =>
  new Set(
    (detail.value.sessions || [])
      .map((session) => Number(session.booking_id || 0))
      .filter(Boolean)
  )
);

const tutorPreviousEntries = computed(() => {
  const pastBookingsNeedingReports = (detail.value.bookings || [])
    .filter((booking) => {
      const status = String(booking.status || '').toLowerCase();
      const isPast = buildBookingTimestamp(booking) < Date.now();
      return isPast && ['confirmed', 'completed'].includes(status) && !tutorReportedBookingIds.value.has(Number(booking.id));
    })
    .map((booking) => ({
      key: `booking-${booking.id}`,
      type: 'booking',
      id: booking.id,
      student_user_id: booking.student_user_id,
      student_name: booking.student_name,
      subject: booking.subject || 'General',
      dateLabel: formatDate(booking.booking_date),
      timeLabel: formatTime(booking.start_time),
      attendanceLabel: attendanceLabel(booking.attendance_status),
      attendanceVariant: attendanceVariant(booking.attendance_status),
      statusLabel: 'Report needed',
      statusVariant: 'warning',
      timestamp: buildBookingTimestamp(booking)
    }));

  const reportedSessions = (detail.value.sessions || [])
    .filter((session) => new Date(session.session_date).getTime() < Date.now())
    .map((session) => ({
      key: `session-${session.id}`,
      type: 'session',
      id: session.id,
      student_user_id: session.student_user_id,
      student_name: session.student_name,
      subject: session.topic || 'General',
      dateLabel: formatDate(session.session_date),
      timeLabel: formatTime(session.session_date),
      attendanceLabel: attendanceLabel(session.attendance_status),
      attendanceVariant: attendanceVariant(session.attendance_status),
      statusLabel: 'Reported',
      statusVariant: 'success',
      timestamp: new Date(session.session_date).getTime()
    }));

  return [...reportedSessions, ...pastBookingsNeedingReports].sort((left, right) => right.timestamp - left.timestamp);
});

const studentBookingsNeedingReports = computed(() => {
  const reportedSessions = managerViewedStudentSessions.value.length
    ? managerViewedStudentSessions.value
    : (detail.value.sessions || []);
  const reportedIds = new Set(
    reportedSessions
      .map((session) => Number(session.booking_id || 0))
      .filter(Boolean)
  );

  return (detail.value.bookings || [])
    .filter((booking) => {
      const isPast = buildBookingTimestamp(booking) < Date.now();
      const status = String(booking.status || '').toLowerCase();
      return isPast && ['confirmed', 'completed'].includes(status) && !reportedIds.has(Number(booking.id));
    })
    .sort((left, right) => buildBookingTimestamp(right) - buildBookingTimestamp(left));
});

const phoneFieldStyle = computed(() =>
  detail.value.role === 'manager' ? '' : 'grid-column: 1 / -1;'
);

const populateForm = () => {
  form.fullName = detail.value.full_name || '';
  form.email = detail.value.email || '';
  form.phoneNumber = sanitizePhoneNumber(detail.value.phone_number || detail.value.profile?.phone_number || '');
  form.accountStatus = detail.value.account_status || 'active';
  form.bio = detail.value.bio || detail.value.profile?.bio || '';
  form.specialism = detail.value.specialism || detail.value.profile?.specialism || '';
  form.yearGroup = detail.value.year_group || detail.value.profile?.year_group || '';
  form.targetGrade = detail.value.target_grade || detail.value.profile?.target_grade || '';
  form.subjectFocus = detail.value.subject_focus || detail.value.profile?.subject_focus || '';
  form.notes = detail.value.notes || detail.value.profile?.notes || '';
  form.title = detail.value.title || detail.value.profile?.title || '';
};

const loadDetail = async (userId = route.params.id) => {
  const response = await api.get(`/users/${userId}/detail`);
  detail.value = response.data.data || {};
  populateForm();
};

const loadReferenceData = async () => {
  const requests = [];

  if (['tutor', 'parent'].includes(detail.value.role)) {
    requests.push(api.get('/students'));
  } else {
    requests.push(Promise.resolve({ data: { data: [] } }));
  }

  if (detail.value.role === 'parent') {
    requests.push(api.get('/tutors', { params: { includeAll: true } }));
  } else {
    requests.push(Promise.resolve({ data: { data: [] } }));
  }

  const [studentsResponse, tutorsResponse] = await Promise.all(requests);
  students.value = studentsResponse.data.data || [];
  tutors.value = tutorsResponse.data.data || [];
};

const loadSelectedChild = async () => {
  if (detail.value.role !== 'parent') {
    selectedChildDashboard.value = {};
    selectedChildSessions.value = [];
    selectedChildBookings.value = [];
    return;
  }

  const childId = Number(selectedChildId.value || detail.value.linkedChildren?.[0]?.user_id || 0);

  if (!childId) {
    selectedChildDashboard.value = {};
    selectedChildSessions.value = [];
    selectedChildBookings.value = [];
    return;
  }

  selectedChildId.value = String(childId);

  const [dashboardResponse, sessionsResponse, bookingsResponse] = await Promise.all([
    api.get('/students/dashboard', { params: { studentUserId: childId } }),
    api.get('/sessions', { params: { studentUserId: childId } }),
    api.get('/bookings', { params: { studentUserId: childId } })
  ]);

  selectedChildDashboard.value = dashboardResponse.data.data || {};
  selectedChildSessions.value = sessionsResponse.data.data || [];
  selectedChildBookings.value = bookingsResponse.data.data || [];
};

const loadManagerViewedStudent = async () => {
  if (detail.value.role !== 'student') {
    managerViewedStudentDashboard.value = {};
    managerViewedStudentSessions.value = [];
    return;
  }

  const studentUserId = Number(detail.value.id || 0);

  if (!studentUserId) {
    managerViewedStudentDashboard.value = {};
    managerViewedStudentSessions.value = [];
    return;
  }

  const [dashboardResult, sessionsResult] = await Promise.allSettled([
    api.get('/students/dashboard', { params: { studentUserId } }),
    api.get('/sessions', { params: { studentUserId } })
  ]);

  managerViewedStudentDashboard.value =
    dashboardResult.status === 'fulfilled'
      ? dashboardResult.value.data.data || {}
      : studentDashboardData.value;

  managerViewedStudentSessions.value =
    sessionsResult.status === 'fulfilled'
      ? Array.isArray(sessionsResult.value.data.data)
        ? sessionsResult.value.data.data
        : []
      : Array.isArray(detail.value.sessions)
        ? detail.value.sessions
        : [];
};

const loadPage = async (userId = route.params.id) => {
  if (!userId) {
    return;
  }

  loading.value = true;
  loadError.value = '';

  try {
    await loadDetail(userId);
    await loadReferenceData();

    if (detail.value.role === 'parent') {
      selectedChildId.value = String(route.query.studentUserId || detail.value.linkedChildren?.[0]?.user_id || '');
      await loadSelectedChild();
    } else if (detail.value.role === 'student') {
      await loadManagerViewedStudent();
    } else {
      managerViewedStudentDashboard.value = {};
      managerViewedStudentSessions.value = [];
    }
  } catch (error) {
    detail.value = {};
    students.value = [];
    tutors.value = [];
    selectedChildDashboard.value = {};
    selectedChildSessions.value = [];
    selectedChildBookings.value = [];
    managerViewedStudentDashboard.value = {};
    managerViewedStudentSessions.value = [];
    loadError.value = error.response?.data?.message || 'Manager user detail could not be loaded right now.';
  } finally {
    loading.value = false;
  }
};

const saveUser = async () => {
  saving.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.put(`/users/${detail.value.id}`, {
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber || null,
      accountStatus: form.accountStatus,
      bio: form.bio || null,
      specialism: form.specialism || null,
      yearGroup: form.yearGroup || null,
      targetGrade: form.targetGrade || null,
      subjectFocus: form.subjectFocus || null,
      notes: form.notes || null,
      title: form.title || null
    });
    feedback.value = { message: 'User details updated successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'User details could not be updated.',
      variant: 'error'
    };
  } finally {
    saving.value = false;
  }
};

const assignTutorStudent = async (studentUserId) => {
  relationshipBusy.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/relationships/tutor-students', {
      tutorUserId: Number(detail.value.id),
      studentUserId: Number(studentUserId)
    });
    feedback.value = { message: 'Student assigned to tutor successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Student could not be assigned right now.',
      variant: 'error'
    };
  } finally {
    relationshipBusy.value = false;
  }
};

const removeTutorStudent = async (studentUserId) => {
  const relationship = (detail.value.assignedStudents || []).find((student) => Number(student.user_id) === Number(studentUserId));

  if (!relationship) {
    return;
  }

  relationshipBusy.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    const linksResponse = await api.get('/relationships/tutor-students');
    const link = (linksResponse.data.data || []).find(
      (item) =>
        Number(item.tutor_user_id) === Number(detail.value.id) &&
        Number(item.student_user_id) === Number(studentUserId)
    );

    if (!link) {
      throw new Error('Relationship not found');
    }

    await api.delete(`/relationships/tutor-students/${link.id}`);
    feedback.value = { message: 'Student unassigned successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Student could not be unassigned.',
      variant: 'error'
    };
  } finally {
    relationshipBusy.value = false;
  }
};

const addParentStudent = async () => {
  if (!parentStudentForm.studentUserId || !parentStudentForm.tutorUserId) {
    feedback.value = {
      message: 'Select both a student and tutor before saving this parent-student link.',
      variant: 'error'
    };
    return;
  }

  relationshipBusy.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/relationships/parent-students', {
      parentUserId: Number(detail.value.id),
      studentUserId: Number(parentStudentForm.studentUserId),
      relationshipLabel: parentStudentForm.relationshipLabel || null
    });

    if (parentStudentForm.tutorUserId) {
      await api.post('/relationships/tutor-students', {
        tutorUserId: Number(parentStudentForm.tutorUserId),
        studentUserId: Number(parentStudentForm.studentUserId)
      });
    }

    parentStudentForm.studentUserId = '';
    parentStudentForm.relationshipLabel = '';
    parentStudentForm.tutorUserId = '';
    feedback.value = { message: 'Parent-student relationship saved successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Parent-student relationship could not be saved.',
      variant: 'error'
    };
  } finally {
    relationshipBusy.value = false;
  }
};

const removeParentStudent = async (studentUserId) => {
  relationshipBusy.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    const linksResponse = await api.get('/relationships/parent-students');
    const link = (linksResponse.data.data || []).find(
      (item) =>
        Number(item.parent_user_id) === Number(detail.value.id) &&
        Number(item.student_user_id) === Number(studentUserId)
    );

    if (!link) {
      throw new Error('Relationship not found');
    }

    await api.delete(`/relationships/parent-students/${link.id}`);
    feedback.value = { message: 'Parent-student relationship removed successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Parent-student relationship could not be removed.',
      variant: 'error'
    };
  } finally {
    relationshipBusy.value = false;
  }
};

const updateBookingStatus = async (bookingId, status) => {
  bookingActionId.value = bookingId;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.put(`/bookings/${bookingId}/status`, { status });
    feedback.value = { message: 'Booking updated successfully.', variant: 'success' };
    await loadPage();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Booking could not be updated.',
      variant: 'error'
    };
  } finally {
    bookingActionId.value = null;
  }
};

const openReportEntry = (entry) => {
  if (entry.type === 'session') {
    navigateFromManagerDetail({
      path: `/app/manager/sessions/${entry.id}`,
      query: { userId: String(detail.value.id) }
    });
    return;
  }

  navigateFromManagerDetail(buildManagerCreateReportRoute(entry.id));
};

const openUser = (userId) => {
  navigateFromManagerDetail(`/app/manager/users/${userId}`);
};

const selectChild = async (studentUserId) => {
  selectedChildId.value = String(studentUserId);
  await loadSelectedChild();
};

const createManagerParentBooking = async (payload) => {
  bookingSaving.value = true;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.post('/bookings', {
      ...payload,
      parentUserId: Number(detail.value.id)
    });
    feedback.value = { message: 'Booking requested successfully.', variant: 'success' };
    await loadSelectedChild();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Booking could not be created right now.',
      variant: 'error'
    };
  } finally {
    bookingSaving.value = false;
  }
};

const viewManagerParentBookingReport = (booking) => {
  const report = selectedChildSessions.value.find((session) => Number(session.booking_id) === Number(booking.id));

  if (!report) {
    return;
  }

  navigateFromManagerDetail({
    path: `/app/manager/sessions/${report.id}`,
    query: {
      userId: String(detail.value.id),
      studentUserId: selectedChildId.value ? String(selectedChildId.value) : ''
    }
  });
};

const requestManagerParentBookingReport = (booking) => {
  navigateFromManagerDetail({
    path: '/app/manager/messages',
    query: {
      recipientUserId: String(booking.tutor_user_id || ''),
      studentUserId: selectedChildId.value ? String(selectedChildId.value) : '',
      subject: `Session report request: ${booking.subject || 'Tutoring session'}`
    }
  });
};

const messageTutorAboutManagerParentBooking = (booking) => {
  navigateFromManagerDetail({
    path: '/app/manager/messages',
    query: {
      recipientUserId: String(booking.tutor_user_id || ''),
      studentUserId: selectedChildId.value ? String(selectedChildId.value) : '',
      subject: `Booking follow-up: ${booking.subject || 'Tutoring session'}`
    }
  });
};

watch(
  () => route.params.id,
  (nextId, previousId) => {
    if (!nextId || nextId === previousId) {
      return;
    }

    loadPage(nextId);
  }
);

watch(
  () => managerStudent.value?.id,
  () => {
    managerStudentSelectedSubject.value = 'all';
    managerStudentActiveGuardianIndex.value = 0;
  }
);

watch(
  () => managerStudentSubjects.value.map((subject) => subject.name),
  (subjectNames) => {
    if (managerStudentSelectedSubject.value === 'all') {
      return;
    }

    if (!subjectNames.includes(managerStudentSelectedSubject.value)) {
      managerStudentSelectedSubject.value = 'all';
    }
  }
);

watch(
  () => managerStudentGuardians.value.length,
  (length) => {
    if (!length || managerStudentActiveGuardianIndex.value > length - 1) {
      managerStudentActiveGuardianIndex.value = 0;
    }
  }
);

onMounted(loadPage);

const subjectStyle = (subject) => ({
  '--subject-accent': subject.color.accent,
  '--subject-surface': subject.color.surface,
  '--subject-ink': subject.color.ink
});

function extractLearningSubjects(value) {
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
    .map(findCanonicalLearningSubject)
    .filter(Boolean);

  return [...new Set([...matchedOptions, ...keywordMatches, ...separatedMatches])];
}

function resolveLearningSessionSubjects(session) {
  const recordedSubjects = extractLearningSubjects(
    session?.subject || session?.booking_subject || session?.bookingSubject || ''
  );

  if (recordedSubjects.length) {
    return recordedSubjects;
  }

  return extractLearningSubjects(session?.topic || '');
}

function sessionMatchesLearningSubject(session, subjectName, studentSubjectFocus = '') {
  const sessionSubjects = resolveLearningSessionSubjects(session);

  if (sessionSubjects.includes(subjectName)) {
    return true;
  }

  const studentSubjects = extractLearningSubjects(studentSubjectFocus);

  if (studentSubjects.includes(subjectName) && sessionSubjects.length === 0) {
    return true;
  }

  if (studentSubjects.length === 1 && studentSubjects[0] === subjectName) {
    return true;
  }

  return false;
}

function findCanonicalLearningSubject(value) {
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

function previewText(value, fallback) {
  const text = String(value || '').trim() || fallback;
  return text.length > 110 ? `${text.slice(0, 107)}...` : text;
}

function buildBookingTimestamp(booking) {
  const datePart = normaliseBookingDatePart(booking.booking_date);
  const timePart = normaliseBookingTimePart(booking.start_time);

  if (!datePart || !timePart) {
    return Number.NaN;
  }

  return new Date(`${datePart}T${timePart}:00`).getTime();
}

function formatDate(value) {
  if (!value) {
    return 'No date';
  }

  const normalised = String(value).includes('T') ? value : `${value}T00:00:00`;
  return new Date(normalised).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(value) {
  if (!value) {
    return 'No time';
  }

  const text = String(value).trim();
  const normalised = /^\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? `2000-01-01T${text.length === 5 ? `${text}:00` : text}`
    : text.includes(' ') && !text.includes('T')
      ? text.replace(' ', 'T')
      : text;

  return new Date(normalised).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
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

function statusVariant(status) {
  if (status === 'confirmed' || status === 'completed' || status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled' || status === 'rejected') return 'danger';
  return 'default';
}

function approvalVariant(status) {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'default';
}

function sanitizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

function normaliseBookingDatePart(value) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (text.includes('T')) {
    return text.slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normaliseBookingTimePart(value) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return text.slice(0, 5);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function buildManagerCreateReportRoute(bookingId) {
  return {
    path: '/app/manager/reports/new',
    query: {
      bookingId: String(bookingId),
      userId: String(detail.value.id)
    }
  };
}

function navigateFromManagerDetail(to) {
  window.location.assign(router.resolve(to).href);
}

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

.manager-detail-grid {
  align-items: start;
}

.detail-rows {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface-subtle);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.detail-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detail-row span {
  min-width: 180px;
  color: var(--muted);
}

.detail-value {
  color: var(--heading);
  text-align: right;
  line-height: 1.5;
  max-width: 65%;
  word-break: break-word;
}

.session-subsection {
  display: grid;
  gap: 16px;
}

.dashboard-table-wrap {
  max-height: 320px;
}

.dashboard-actions-cell {
  min-width: 220px;
}

.dashboard-action-cell {
  width: 1%;
  min-width: 132px;
  white-space: nowrap;
}

.dashboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compact-button {
  padding: 8px 12px;
  font-size: 0.84rem;
  white-space: nowrap;
}

.manager-action-button {
  background: #fff;
  color: var(--ink);
  border-color: var(--line);
  box-shadow: none;
}

.manager-action-button:hover,
.manager-action-button:focus-visible {
  background: #fff;
  color: var(--ink);
  border-color: var(--primary-soft);
}

@media (max-width: 760px) {
  .detail-row {
    display: grid;
    gap: 4px;
  }

  .guardian-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-value {
    max-width: 100%;
    text-align: left;
  }

  .subject-card {
    width: 100%;
  }
}
</style>
