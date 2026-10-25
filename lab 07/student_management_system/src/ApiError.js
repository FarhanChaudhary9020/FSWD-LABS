class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource conflict") {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
