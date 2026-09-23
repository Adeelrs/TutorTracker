const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const tutorService = require('../services/tutorService');

const listTutors = asyncHandler(async (req, res) => {
  const includeAll = req.user.role === 'manager' && req.query.includeAll === 'true';
  const tutors = await tutorService.listTutors(includeAll);
  sendSuccess(res, tutors, 'Tutors loaded successfully');
});

const getAssignedStudents = asyncHandler(async (req, res) => {
  const students = await tutorService.listAssignedStudents(req.user.id);
  sendSuccess(res, students, 'Assigned students loaded');
});

module.exports = {
  listTutors,
  getAssignedStudents
};
