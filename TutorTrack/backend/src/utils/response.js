const sendSuccess = (res, data = null, message = 'Request completed successfully', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

module.exports = {
  sendSuccess
};
