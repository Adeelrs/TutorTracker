<template>
  <div class="stack">
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
            <p class="page-eyebrow">Tutor dashboard</p>
            <h2>Students and sessions</h2>
          </div>
        </div>
        <p class="muted">
          Work from one tutor home page: search assigned students at the top, then manage requested, upcoming, and previous sessions underneath.
        </p>
      </section>

      <section class="panel">
        <div class="section-header">
          <div>
            <p class="eyebrow">Students</p>
            <h3>{{ filteredStudents.length }} assigned students</h3>
          </div>
        </div>

        <EmptyState
          v-if="!students.length"
          title="No assigned students yet"
          message="Students will appear here once a manager links learners to this tutor."
        />

        <template v-else>
          <div class="filter-row tutor-student-filters">
            <label class="field">
              <span>Student ID</span>
              <input v-model.trim="idFilter" type="search" placeholder="Search platform user ID" />
            </label>

            <label class="field">
              <span>Name</span>
              <input v-model.trim="nameFilter" type="search" placeholder="Search student name" />
            </label>

            <label class="field">
              <span>Learning stage</span>
              <select v-model="stageFilter">
                <option value="">All stages</option>
                <option v-for="stage in learningStages" :key="stage" :value="stage">{{ stage }}</option>
              </select>
            </label>

            <label class="field">
              <span>Year group</span>
              <select v-model="yearFilter">
                <option value="">All year groups</option>
                <option v-for="year in yearGroups" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>
          </div>

          <EmptyState
            v-if="!filteredStudents.length"
            title="No students match these filters"
            message="Try clearing one of the filters to see more assigned students."
          />

          <div v-else class="table-wrap table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Learning stage</th>
                  <th>Year group</th>
                  <th>Subject focus</th>
                  <th>Last session date</th>
                  <th>Next session date</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="student in filteredStudents"
                  :key="student.id"
                  class="clickable-row"
                  tabindex="0"
                  @click="openStudent(student.id)"
                  @keyup.enter="openStudent(student.id)"
                >
                  <td><strong>{{ student.platform_user_id || 'Not assigned' }}</strong></td>
                  <td>{{ student.full_name }}</td>
                  <td>{{ student.learning_stage || 'Not set' }}</td>
                  <td>{{ student.year_group || 'Not set' }}</td>
                  <td>{{ student.subject_focus || 'General tutoring support' }}</td>
                  <td>{{ formatDateTime(student.last_session_date, 'No sessions recorded yet') }}</td>
                  <td>{{ formatDateTime(student.next_session_date, 'No upcoming session booked') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
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
                <h4>{{ requestedSessions.length }} waiting for tutor action</h4>
              </div>
            </div>

            <EmptyState
              v-if="!requestedSessions.length"
              title="No requested sessions"
              message="New booking requests will appear here when students or parents ask for tutoring."
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
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="booking in requestedSessions" :key="booking.id">
                    <td>{{ formatDate(booking.booking_date) }}</td>
                    <td>{{ formatTime(booking.start_time) }}</td>
                    <td>{{ booking.student_name || 'Student' }}</td>
                    <td>{{ booking.parent_name || 'No linked parent' }}</td>
                    <td>{{ booking.subject || 'General' }}</td>
                    <td>{{ booking.duration_minutes }} mins</td>
                    <td class="session-notes-cell">{{ previewText(booking.notes, 'No booking note.') }}</td>
                    <td class="dashboard-actions-cell">
                      <div class="dashboard-actions">
                        <button class="primary-button compact-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'confirmed')">
                          {{ bookingActionId === booking.id ? 'Saving...' : 'Accept' }}
                        </button>
                        <button class="ghost-button compact-button tutor-action-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'cancelled')">
                          Reject
                        </button>
                        <button v-if="booking.parent_user_id" class="secondary-button compact-button tutor-action-button" @click="messageParent(booking)">
                          Message parent
                        </button>
                        <button class="secondary-button compact-button tutor-action-button" @click="messageStudent(booking)">
                          Message student
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
                <h4>{{ filteredUpcomingSessions.length }} confirmed future sessions</h4>
              </div>
            </div>

            <EmptyState
              v-if="!upcomingSessionsBase.length"
              title="No upcoming sessions"
              message="Confirmed future sessions will appear here after you accept a booking."
            />

            <template v-else>
              <div class="filter-row tutor-session-filters">
                <label class="field">
                  <span>Session range</span>
                  <select v-model="upcomingWindowFilter">
                    <option value="all">All sessions</option>
                    <option value="this_week">Sessions this week</option>
                    <option value="next_week">Sessions next week</option>
                  </select>
                </label>

                <label class="field">
                  <span>Search by student ID, name, or year group</span>
                  <input v-model.trim="upcomingSearch" type="search" placeholder="Search future sessions" />
                </label>
              </div>

              <EmptyState
                v-if="!filteredUpcomingSessions.length"
                title="No future sessions match these filters"
                message="Try changing the search or session range to see more bookings."
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
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="booking in filteredUpcomingSessions" :key="booking.id">
                    <td>{{ formatDate(booking.booking_date) }}</td>
                    <td>{{ formatTime(booking.start_time) }}</td>
                    <td>{{ booking.student_platform_user_id || 'Not assigned' }}</td>
                    <td>{{ booking.student_name || 'Student' }}</td>
                    <td>{{ booking.subject || 'General' }}</td>
                    <td>{{ booking.exam_board || 'General' }}</td>
                    <td>{{ booking.duration_minutes }} mins</td>
                    <td><UserBadge :text="booking.status" :variant="statusVariant(booking.status)" /></td>
                    <td class="dashboard-actions-cell">
                      <div class="dashboard-actions">
                        <button class="secondary-button compact-button tutor-action-button" @click="openBookingReport(booking)">
                          {{ bookingReportLabel(booking) }}
                        </button>
                        <button class="ghost-button compact-button tutor-action-button" :disabled="bookingActionId === booking.id" @click="updateBookingStatus(booking.id, 'cancelled')">
                          Cancel
                        </button>
                        <button v-if="booking.parent_user_id" class="secondary-button compact-button tutor-action-button" @click="messageParent(booking)">
                          Message parent
                        </button>
                        <button class="secondary-button compact-button tutor-action-button" @click="messageStudent(booking)">
                          Message student
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </template>
          </section>

          <section class="session-subsection">
            <div class="section-header">
              <div>
                <p class="eyebrow">Previous sessions</p>
                <h4>{{ filteredPreviousEntries.length }} past sessions and report tasks</h4>
              </div>
            </div>

            <EmptyState
              v-if="!previousEntriesBase.length"
              title="No previous sessions"
              message="Completed session reports will appear here once tutoring sessions have been recorded."
            />

            <template v-else>
              <div class="filter-row tutor-session-filters">
                <label class="field">
                  <span>Search by student ID, name, or year group</span>
                  <input v-model.trim="pastSearch" type="search" placeholder="Search past sessions" />
                </label>

                <label class="field">
                  <span>Report status</span>
                  <select v-model="pastReportStatusFilter">
                    <option value="all">All report statuses</option>
                    <option value="reported">Reported</option>
                    <option value="report_needed">Report needed</option>
                  </select>
                </label>
              </div>

              <EmptyState
                v-if="!filteredPreviousEntries.length"
                title="No past sessions match these filters"
                message="Try changing the search or report status to see more session history."
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
                    <th>Next steps / note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in filteredPreviousEntries" :key="entry.key">
                    <td>{{ entry.dateLabel }}</td>
                    <td>{{ entry.timeLabel }}</td>
                    <td>{{ entry.student_name || 'Student' }}</td>
                    <td>{{ entry.subject }}</td>
                    <td>
                      <UserBadge :text="entry.attendanceLabel" :variant="entry.attendanceVariant" />
                    </td>
                    <td>
                      <UserBadge :text="entry.statusLabel" :variant="entry.statusVariant" />
                    </td>
                    <td class="session-notes-cell">{{ previewText(entry.summary, 'Open the report to review this session.') }}</td>
                    <td class="dashboard-actions-cell">
                      <div class="dashboard-actions dashboard-actions-spread">
                        <button
                          class="secondary-button compact-button tutor-action-button"
                          @click="openReportEntry(entry)"
                        >
                          {{ entry.type === 'session' ? 'View Report' : 'Create Report' }}
                        </button>
                        <button v-if="entry.parent_user_id" class="ghost-button compact-button tutor-action-button" @click="messageParent(entry)">
                          Message parent
                        </button>
                        <button class="ghost-button compact-button tutor-action-button" @click="messageStudent(entry)">
                          Message student
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </template>
          </section>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';
import LoadingState from '../../components/LoadingState.vue';
import EmptyState from '../../components/EmptyState.vue';
import UserBadge from '../../components/UserBadge.vue';

const router = useRouter();
const loading = ref(true);
const loadError = ref('');
const feedback = ref({ message: '', variant: 'success' });
const bookingActionId = ref(null);
const students = ref([]);
const sessions = ref([]);
const bookings = ref([]);
const stageFilter = ref('');
const yearFilter = ref('');
const idFilter = ref('');
const nameFilter = ref('');
const upcomingWindowFilter = ref('all');
const upcomingSearch = ref('');
const pastSearch = ref('');
const pastReportStatusFilter = ref('all');

const learningStages = ['Primary school', 'Secondary school', 'College / post-16'];
const yearGroups = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

const studentsWithMeta = computed(() => {
  const upcomingBookingsByStudent = new Map();

  [...bookings.value]
    .filter((booking) => ['confirmed', 'pending'].includes(String(booking.status || '').toLowerCase()))
    .filter((booking) => buildBookingTimestamp(booking) >= Date.now())
    .sort((left, right) => buildBookingTimestamp(left) - buildBookingTimestamp(right))
    .forEach((booking) => {
      const studentId = Number(booking.student_user_id);

      if (!upcomingBookingsByStudent.has(studentId)) {
        upcomingBookingsByStudent.set(studentId, buildBookingDateTime(booking) || '');
      }
    });

  return students.value.map((student) => ({
    ...student,
    learning_stage: getLearningStage(student.year_group),
    next_session_date: upcomingBookingsByStudent.get(Number(student.id)) || ''
  }));
});

const studentMetaByUserId = computed(
  () => new Map(studentsWithMeta.value.map((student) => [Number(student.id), student]))
);

const reportSessionByBookingId = computed(() => {
  const map = new Map();

  [...sessions.value]
    .sort((left, right) => new Date(right.session_date).getTime() - new Date(left.session_date).getTime())
    .forEach((session) => {
      const bookingId = Number(session.booking_id || 0);

      if (bookingId && !map.has(bookingId)) {
        map.set(bookingId, session);
      }
    });

  return map;
});

const filteredStudents = computed(() =>
  studentsWithMeta.value.filter((student) => {
    const idMatches =
      !idFilter.value ||
      String(student.platform_user_id || '').toLowerCase().includes(idFilter.value.toLowerCase()) ||
      String(student.id || '').includes(idFilter.value);
    const nameMatches = !nameFilter.value || String(student.full_name || '').toLowerCase().includes(nameFilter.value.toLowerCase());
    const stageMatches = !stageFilter.value || student.learning_stage === stageFilter.value;
    const yearMatches = !yearFilter.value || student.year_group === yearFilter.value;

    return idMatches && nameMatches && stageMatches && yearMatches;
  })
);

const requestedSessions = computed(() =>
  [...bookings.value]
    .filter((booking) => String(booking.status || '').toLowerCase() === 'pending')
    .sort((left, right) => buildBookingTimestamp(left) - buildBookingTimestamp(right))
);

const upcomingSessionsBase = computed(() =>
  [...bookings.value]
    .filter((booking) => {
      const status = String(booking.status || '').toLowerCase();
      return status === 'confirmed' && buildBookingTimestamp(booking) >= Date.now();
    })
    .sort((left, right) => buildBookingTimestamp(left) - buildBookingTimestamp(right))
);

const filteredUpcomingSessions = computed(() =>
  upcomingSessionsBase.value.filter((booking) => {
    const student = studentMetaByUserId.value.get(Number(booking.student_user_id));
    const searchMatches = matchesStudentSearch(
      {
        studentName: booking.student_name,
        studentPlatformUserId: booking.student_platform_user_id,
        yearGroup: student?.year_group
      },
      upcomingSearch.value
    );

    return searchMatches && matchesUpcomingWindow(booking, upcomingWindowFilter.value);
  })
);

const reportedBookingIds = computed(() =>
  new Set(
    sessions.value
      .map((session) => Number(session.booking_id || 0))
      .filter(Boolean)
  )
);

const previousEntriesBase = computed(() => {
  const pastBookingsNeedingReports = bookings.value
    .filter((booking) => {
      const status = String(booking.status || '').toLowerCase();
      const isPast = buildBookingTimestamp(booking) < Date.now();
      return isPast && ['confirmed', 'completed'].includes(status) && !reportedBookingIds.value.has(Number(booking.id));
    })
    .map((booking) => ({
      key: `booking-${booking.id}`,
      type: 'booking',
      id: booking.id,
      student_user_id: booking.student_user_id,
      parent_user_id: booking.parent_user_id,
      student_name: booking.student_name,
      student_platform_user_id: booking.student_platform_user_id,
      year_group: studentMetaByUserId.value.get(Number(booking.student_user_id))?.year_group || '',
      subject: booking.subject || 'General',
      dateLabel: formatDate(booking.booking_date),
      timeLabel: formatTime(booking.start_time),
      attendanceLabel: attendanceLabel(booking.attendance_status),
      attendanceVariant: attendanceVariant(booking.attendance_status),
      statusLabel: 'Report needed',
      reportStatusKey: 'report_needed',
      statusVariant: 'warning',
      summary: booking.notes || 'Create a report for this completed booking.',
      timestamp: buildBookingTimestamp(booking)
    }));

  const reportedSessions = sessions.value
    .filter((session) => new Date(session.session_date).getTime() < Date.now())
    .map((session) => ({
      key: `session-${session.id}`,
      type: 'session',
      id: session.id,
      student_user_id: session.student_user_id,
      parent_user_id: session.parent_user_id,
      student_name: session.student_name,
      student_platform_user_id: session.student_platform_user_id,
      year_group: studentMetaByUserId.value.get(Number(session.student_user_id))?.year_group || '',
      subject: session.topic || 'General',
      dateLabel: formatDate(session.session_date),
      timeLabel: formatTime(session.session_date),
      attendanceLabel: attendanceLabel(session.attendance_status),
      attendanceVariant: attendanceVariant(session.attendance_status),
      statusLabel: 'Reported',
      reportStatusKey: 'reported',
      statusVariant: 'success',
      summary: session.next_steps || session.notes || 'Open the session report to review this session.',
      timestamp: new Date(session.session_date).getTime()
    }));

  return [...reportedSessions, ...pastBookingsNeedingReports]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 20);
});

const filteredPreviousEntries = computed(() =>
  previousEntriesBase.value.filter((entry) => {
    const searchMatches = matchesStudentSearch(
      {
        studentName: entry.student_name,
        studentPlatformUserId: entry.student_platform_user_id,
        yearGroup: entry.year_group
      },
      pastSearch.value
    );

    const reportStatusMatches =
      pastReportStatusFilter.value === 'all' || entry.reportStatusKey === pastReportStatusFilter.value;

    return searchMatches && reportStatusMatches;
  })
);

const loadDashboard = async () => {
  loading.value = true;
  loadError.value = '';

  const [studentsResult, sessionsResult, bookingsResult] = await Promise.allSettled([
    api.get('/tutors/assigned-students'),
    api.get('/sessions'),
    api.get('/bookings')
  ]);

  const failures = [];

  if (studentsResult.status === 'fulfilled') {
    students.value = studentsResult.value.data.data || [];
  } else {
    students.value = [];
    failures.push(studentsResult.reason?.response?.data?.message || 'Assigned students could not be loaded.');
  }

  if (sessionsResult.status === 'fulfilled') {
    sessions.value = sessionsResult.value.data.data || [];
  } else {
    sessions.value = [];
    failures.push(sessionsResult.reason?.response?.data?.message || 'Session reports could not be loaded.');
  }

  if (bookingsResult.status === 'fulfilled') {
    bookings.value = bookingsResult.value.data.data || [];
  } else {
    bookings.value = [];
    failures.push(bookingsResult.reason?.response?.data?.message || 'Bookings could not be loaded.');
  }

  if (failures.length) {
    loadError.value = failures[0];
  }

  loading.value = false;
};

const updateBookingStatus = async (bookingId, status) => {
  bookingActionId.value = bookingId;
  feedback.value = { message: '', variant: 'success' };

  try {
    await api.put(`/bookings/${bookingId}/status`, { status });
    feedback.value = {
      message: status === 'confirmed' ? 'Session request accepted successfully.' : 'Booking updated successfully.',
      variant: 'success'
    };
    await loadDashboard();
  } catch (error) {
    feedback.value = {
      message: error.response?.data?.message || 'Booking could not be updated.',
      variant: 'error'
    };
  } finally {
    bookingActionId.value = null;
  }
};

const messageParent = (item) => {
  if (!item.parent_user_id) {
    return;
  }

  router.push({
    path: '/app/tutor/messages',
    query: {
      recipientUserId: String(item.parent_user_id),
      studentUserId: item.student_user_id ? String(item.student_user_id) : undefined,
      subject: buildConversationSubject(item)
    }
  });
};

const messageStudent = (item) => {
  if (!item.student_user_id) {
    return;
  }

  router.push({
    path: '/app/tutor/messages',
    query: {
      recipientUserId: String(item.student_user_id),
      studentUserId: String(item.student_user_id),
      subject: buildConversationSubject(item)
    }
  });
};

const openStudent = (studentId) => {
  router.push(`/app/tutor/students/${studentId}`);
};

const openReportEntry = (entry) => {
  if (entry.type === 'session') {
    router.push({
      path: `/app/tutor/sessions/${entry.id}`,
      query: {
        studentUserId: String(entry.student_user_id)
      }
    });
    return;
  }

  router.push({
    path: '/app/tutor/reports/new',
    query: {
      bookingId: String(entry.id),
      studentUserId: String(entry.student_user_id)
    }
  });
};

const bookingReportLabel = (booking) => (getExistingReportSession(booking) ? 'View Report' : 'Create Report');

const openBookingReport = (booking) => {
  const existingSession = getExistingReportSession(booking);

  if (existingSession) {
    router.push({
      path: `/app/tutor/sessions/${existingSession.id}`,
      query: {
        studentUserId: String(existingSession.student_user_id || booking.student_user_id)
      }
    });
    return;
  }

  router.push({
    path: '/app/tutor/reports/new',
    query: {
      bookingId: String(booking.id),
      studentUserId: String(booking.student_user_id)
    }
  });
};

const formatDate = (value) => {
  if (!value) return 'No date';

  const datePart = normaliseBookingDatePart(value);

  if (!datePart) {
    return 'No date';
  }

  const normalised = `${datePart}T00:00:00`;
  return new Date(normalised).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (value) => {
  if (!value) return 'No time';

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
};

const formatDateTime = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const normalised = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
  const parsed = new Date(normalised);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const previewText = (value, fallback) => {
  const text = String(value || '').trim() || fallback;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const buildConversationSubject = (item) => {
  const studentName = item.student_name || 'Student';
  const dateLabel = item.booking_date ? formatDate(item.booking_date) : item.dateLabel;
  const timeLabel = item.start_time ? formatTime(item.start_time) : item.timeLabel;
  return `${studentName} session - ${dateLabel}, ${timeLabel}`;
};

const statusVariant = (status) => {
  if (status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
};

const attendanceLabel = (status) => {
  if (!status) {
    return 'Not marked';
  }

  if (status === 'not_present') {
    return 'Not present';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const attendanceVariant = (status) => {
  if (status === 'present') return 'success';
  if (status === 'late') return 'warning';
  if (status === 'not_present' || status === 'cancelled') return 'danger';
  return 'default';
};

onMounted(loadDashboard);

function getLearningStage(yearGroup) {
  const value = String(yearGroup || '').trim().toLowerCase();

  if (!value) {
    return '';
  }

  const yearMatch = value.match(/\d+/);
  const yearNumber = Number(yearMatch?.[0]);

  if (yearNumber >= 1 && yearNumber <= 6) {
    return 'Primary school';
  }

  if (yearNumber >= 7 && yearNumber <= 11) {
    return 'Secondary school';
  }

  if (yearNumber >= 12 && yearNumber <= 13) {
    return 'College / post-16';
  }

  return '';
}

function buildBookingTimestamp(booking) {
  const datePart = normaliseBookingDatePart(booking.booking_date);
  const timePart = normaliseBookingTimePart(booking.start_time);

  if (!datePart || !timePart) {
    return Number.NaN;
  }

  return new Date(`${datePart}T${timePart}:00`).getTime();
}

function buildBookingDateTime(booking) {
  const datePart = normaliseBookingDatePart(booking.booking_date);
  const timePart = normaliseBookingTimePart(booking.start_time);

  if (!datePart || !timePart) {
    return '';
  }

  return `${datePart}T${timePart}:00`;
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

  const parsed = new Date(text.replace(' ', 'T'));

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

  const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'));

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getExistingReportSession(booking) {
  return reportSessionByBookingId.value.get(Number(booking.id)) || null;
}

function matchesStudentSearch(values, searchTerm) {
  const needle = String(searchTerm || '').trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [values.studentName, values.studentPlatformUserId, values.yearGroup]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function matchesUpcomingWindow(booking, scope) {
  if (scope === 'all') {
    return true;
  }

  const bookingTimestamp = buildBookingTimestamp(booking);

  if (Number.isNaN(bookingTimestamp)) {
    return false;
  }

  const thisWeekStart = getStartOfWeek(Date.now());
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const weekAfterNextStart = new Date(nextWeekStart);
  weekAfterNextStart.setDate(weekAfterNextStart.getDate() + 7);

  if (scope === 'this_week') {
    return bookingTimestamp >= thisWeekStart.getTime() && bookingTimestamp < nextWeekStart.getTime();
  }

  if (scope === 'next_week') {
    return bookingTimestamp >= nextWeekStart.getTime() && bookingTimestamp < weekAfterNextStart.getTime();
  }

  return true;
}

function getStartOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}
</script>

<style scoped>
.tutor-student-filters {
  margin-bottom: 18px;
}

.tutor-session-filters {
  margin-bottom: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.clickable-row:focus-visible {
  outline: 2px solid rgba(22, 91, 109, 0.35);
  outline-offset: -2px;
}

.session-subsection {
  display: grid;
  gap: 16px;
}

.dashboard-table-wrap {
  max-height: 320px;
}

.dashboard-actions-cell {
  min-width: 470px;
}

.dashboard-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
}

.dashboard-actions-spread {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.dashboard-actions-spread > .compact-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.compact-button {
  padding: 8px 12px;
  font-size: 0.84rem;
  white-space: nowrap;
}

.tutor-action-button,
.primary-button.compact-button,
.secondary-button.compact-button,
.ghost-button.compact-button {
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--line);
  box-shadow: none;
}

.tutor-action-button:hover,
.tutor-action-button:focus-visible,
.primary-button.compact-button:hover,
.primary-button.compact-button:focus-visible,
.secondary-button.compact-button:hover,
.secondary-button.compact-button:focus-visible,
.ghost-button.compact-button:hover,
.ghost-button.compact-button:focus-visible {
  background: #fff;
  color: var(--ink);
  border-color: var(--primary-soft);
}

.session-notes-cell {
  min-width: 240px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .tutor-session-filters {
    grid-template-columns: 1fr;
  }
}
</style>
