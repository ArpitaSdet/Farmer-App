const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  
  // Farmer-friendly error messages as per Section 38
  res.status(statusCode).json({
    success: false,
    message: err.userMessage || 'Something went wrong. Please try again.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    retryable: true,
  });
};

module.exports = errorHandler;
