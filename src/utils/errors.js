const ERROR_CODES = Object.freeze({
  INVALID_LENGTH: "INVALID_LENGTH",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  NO_CHARSET: "NO_CHARSET",
  INVALID_COMPLIANCE: "INVALID_COMPLIANCE",
  INVALID_BODY: "INVALID_BODY",
  INVALID_CREDENTIAL: "INVALID_CREDENTIAL",
  MISSING_AUTH: "MISSING_AUTH",
  INVALID_KEY: "INVALID_KEY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  MISSING_DATE_RANGE: "MISSING_DATE_RANGE",
  INVALID_DATE_FORMAT: "INVALID_DATE_FORMAT",
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
  AUDIT_LOG_NOT_AVAILABLE: "AUDIT_LOG_NOT_AVAILABLE",
});

const HTTP_STATUS = Object.freeze({
  VALIDATION: 400,
  AUTH: 401,
  FORBIDDEN: 403,
  RATE_LIMIT: 429,
  SERVER: 500,
  SERVICE_UNAVAILABLE: 503,
});

const DEFAULT_MESSAGES = Object.freeze({
  [ERROR_CODES.INVALID_LENGTH]: "length must be an integer between 8 and 128",
  [ERROR_CODES.INVALID_QUANTITY]: "quantity must be an integer between 1 and 1000",
  [ERROR_CODES.NO_CHARSET]: "at least one character set must be enabled",
  [ERROR_CODES.INVALID_COMPLIANCE]: "compliance profile is not recognized",
  [ERROR_CODES.INVALID_BODY]: "request body is missing or malformed",
  [ERROR_CODES.INVALID_CREDENTIAL]: "credential is required and must be a non-empty string",
  [ERROR_CODES.MISSING_AUTH]: "authorization header is required",
  [ERROR_CODES.INVALID_KEY]: "api key is invalid",
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: "rate limit exceeded",
  [ERROR_CODES.SERVICE_UNAVAILABLE]: "service temporarily unavailable",
  [ERROR_CODES.MISSING_DATE_RANGE]: "start_date and end_date query parameters are required",
  [ERROR_CODES.INVALID_DATE_FORMAT]: "start_date and end_date must be valid ISO calendar dates (YYYY-MM-DD)",
  [ERROR_CODES.INVALID_DATE_RANGE]: "end_date must be on or after start_date and the range must not exceed 90 days",
  [ERROR_CODES.AUDIT_LOG_NOT_AVAILABLE]:
    "Audit log access requires Pro tier or above. Upgrade at sixsensesolutions.net",
});

function createError(error, message, status, validOptions) {
  const payload = {
    error,
    message: message || DEFAULT_MESSAGES[error] || "request failed",
    status,
  };

  if (Array.isArray(validOptions) && validOptions.length > 0) {
    payload.valid_options = validOptions;
  }

  return payload;
}

module.exports = {
  ERROR_CODES,
  HTTP_STATUS,
  DEFAULT_MESSAGES,
  createError,
};
