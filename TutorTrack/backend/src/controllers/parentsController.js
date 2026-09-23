const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const parentService = require('../services/parentService');

const listParents = asyncHandler(async (req, res) => {
  const parents = await parentService.listParents(req.user);
  sendSuccess(res, parents, 'Parents loaded successfully');
});

module.exports = {
  listParents
};
