import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../services/authStore';
import AppShell from '../layouts/AppShell.vue';

import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import ProfileView from '../views/ProfileView.vue';

import TutorDashboard from '../views/tutor/TutorDashboard.vue';
import TutorStudentDetailPage from '../views/tutor/TutorStudentDetailPage.vue';
import TutorMessagesPage from '../views/tutor/TutorMessagesPage.vue';

import StudentDashboard from '../views/student/StudentDashboard.vue';
import StudentMessagesPage from '../views/student/StudentMessagesPage.vue';

import ParentDashboard from '../views/parent/ParentDashboard.vue';
import ParentMessagesPage from '../views/parent/ParentMessagesPage.vue';
import SessionReportPage from '../views/shared/SessionReportPage.vue';

import ManagerDashboard from '../views/manager/ManagerDashboard.vue';
import ManagerMessagesPage from '../views/manager/ManagerMessagesPage.vue';
import ManagerUserDetailPage from '../views/manager/ManagerUserDetailPage.vue';

const roleHome = {
  tutor: '/app/tutor/dashboard',
  student: '/app/student/dashboard',
  parent: '/app/parent/dashboard',
  manager: '/app/manager/dashboard'
};

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { public: true }
  },
  {
    path: '/app',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: 'tutor/dashboard',  component: TutorDashboard,      meta: { roles: ['tutor'] } },
      { path: 'tutor/students/:id', component: TutorStudentDetailPage, meta: { roles: ['tutor'] } },
      { path: 'tutor/reports/new', component: SessionReportPage, meta: { roles: ['tutor'] } },
      { path: 'tutor/sessions/:id', component: SessionReportPage, meta: { roles: ['tutor'] } },
      { path: 'tutor/messages',   component: TutorMessagesPage,   meta: { roles: ['tutor'] } },
      { path: 'student/dashboard',  component: StudentDashboard,      meta: { roles: ['student'] } },
      { path: 'student/messages',   component: StudentMessagesPage,   meta: { roles: ['student'] } },
      { path: 'student/sessions/:id', component: SessionReportPage, meta: { roles: ['student'] } },

      { path: 'parent/dashboard', component: ParentDashboard,     meta: { roles: ['parent'] } },
      { path: 'parent/messages',  component: ParentMessagesPage,  meta: { roles: ['parent'] } },
      { path: 'parent/sessions/:id', component: SessionReportPage, meta: { roles: ['parent'] } },

      { path: 'manager/dashboard',  component: ManagerDashboard,      meta: { roles: ['manager'] } },
      { path: 'manager/messages',   component: ManagerMessagesPage,   meta: { roles: ['manager'] } },
      { path: 'manager/reports/new', component: SessionReportPage, meta: { roles: ['manager'] } },
      { path: 'manager/sessions/:id', component: SessionReportPage, meta: { roles: ['manager'] } },
      { path: 'manager/users/:id',  component: ManagerUserDetailPage, meta: { roles: ['manager'] } },

      { path: 'profile',  component: ProfileView }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: NotFoundView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const { state, isAuthenticated, fetchCurrentUser } = useAuthStore();

  if (!state.ready) {
    return true;
  }

  if (state.token && !state.user) {
    try {
      await fetchCurrentUser();
    } catch (error) {
      return '/login';
    }
  }

  if (to.meta.public && isAuthenticated.value) {
    return roleHome[state.user.role] || '/login';
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return '/login';
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(state.user?.role)) {
    return roleHome[state.user.role] || '/login';
  }

  return true;
});

export default router;
