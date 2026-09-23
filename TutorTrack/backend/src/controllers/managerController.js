const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const managerService = require('../services/managerService');

const listTutorApprovals = asyncHandler(async (req, res) => {
  const approvals = await managerService.listTutorApprovals();
  sendSuccess(res, approvals, 'Tutor approvals loaded');
});

const updateTutorApproval = asyncHandler(async (req, res) => {
  await managerService.updateTutorApproval(req.user.id, Number(req.params.id), req.body);
  sendSuccess(res, null, 'Tutor approval updated');
});

module.exports = {
  listTutorApprovals,
  updateTutorApproval
};
