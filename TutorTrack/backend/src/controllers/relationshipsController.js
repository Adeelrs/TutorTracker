const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const relationshipService = require('../services/relationshipService');

const listTutorStudentLinks = asyncHandler(async (req, res) => {
  const relationships = await relationshipService.listTutorStudentLinks();
  sendSuccess(res, relationships, 'Tutor-student links loaded');
});

const createTutorStudentLink = asyncHandler(async (req, res) => {
  const id = await relationshipService.createTutorStudentLink(
    req.user,
    Number(req.body.tutorUserId),
    Number(req.body.studentUserId)
  );
  sendSuccess(res, { id }, 'Tutor-student link created', 201);
});

const removeTutorStudentLink = asyncHandler(async (req, res) => {
  await relationshipService.removeTutorStudentLink(req.user, Number(req.params.id));
  sendSuccess(res, null, 'Tutor-student link removed');
});

const listParentStudentLinks = asyncHandler(async (req, res) => {
  const relationships = await relationshipService.listParentStudentLinks();
  sendSuccess(res, relationships, 'Parent-student links loaded');
});

const createParentStudentLink = asyncHandler(async (req, res) => {
  const id = await relationshipService.createParentStudentLink(
    req.user,
    Number(req.body.parentUserId),
    Number(req.body.studentUserId),
    req.body.relationshipLabel,
    Number(req.body.tutorUserId)
  );
  sendSuccess(res, { id }, 'Parent-student link created', 201);
});

const removeParentStudentLink = asyncHandler(async (req, res) => {
  await relationshipService.removeParentStudentLink(req.user, Number(req.params.id));
  sendSuccess(res, null, 'Parent-student link removed');
});

module.exports = {
  listTutorStudentLinks,
  createTutorStudentLink,
  removeTutorStudentLink,
  listParentStudentLinks,
  createParentStudentLink,
  removeParentStudentLink
};
