const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const studentService = require('../services/studentService');

const listStudents = asyncHandler(async (req, res) => {
  const students = await studentService.listStudents(req.user);
  sendSuccess(res, students, 'Students loaded successfully');
});

const getStudentDashboard = asyncHandler(async (req, res) => {
  const dashboard = await studentService.getStudentDashboard(req.user, req.query.studentUserId);
  sendSuccess(res, dashboard, 'Student dashboard loaded');
});

module.exports = {
  listStudents,
  getStudentDashboard
};

