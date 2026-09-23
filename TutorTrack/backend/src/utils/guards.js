const ApiError = require('./apiError');

const ensureApprovedTutor = (user) => {
  if (user.role === 'tutor' && user.profile?.approval_status !== 'approved') {
    throw new ApiError(403, 'Tutor approval is required before using this feature');
  }
};

module.exports = {
  ensureApprovedTutor
};
