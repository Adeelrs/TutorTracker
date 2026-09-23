export const useRoleNavigation = (role) => {
  const navigation = {
    tutor: [
      { label: 'Dashboard', to: '/app/tutor/dashboard' },
      { label: 'Messages', to: '/app/tutor/messages' }
    ],
    student: [
      { label: 'Dashboard', to: '/app/student/dashboard' },
      { label: 'Messages', to: '/app/student/messages' }
    ],
    parent: [
      { label: 'Dashboard', to: '/app/parent/dashboard' },
      { label: 'Messages', to: '/app/parent/messages' }
    ],
    manager: [
      { label: 'Dashboard', to: '/app/manager/dashboard' },
      { label: 'Messages', to: '/app/manager/messages' }
    ]
  };

  return navigation[role] || [];
};
