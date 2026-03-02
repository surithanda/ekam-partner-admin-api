class AppError extends Error {
  constructor(errorCode, message, httpStatus = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.httpStatus = httpStatus;
    this.details = details;
    this.isOperational = true;
  }
}

module.exports = AppError;
