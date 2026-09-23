const ApiError = require('../utils/apiError');
const { getUserFromToken } = require('../services/authService');

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return next(new ApiError(401, 'A bearer token is required'));
    }

    const token = header.replace('Bearer ', '').trim();
    const user = await getUserFromToken(token);

    if (!user) {
      return next(new ApiError(401, 'Your session is invalid or has expired'));
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireAuth
};
