function loadSettings() {
  try {
    return require("../../settings/local.json");
  } catch (error) {
    return require("../settings/local.json");
  }
}

const settings = loadSettings();
const { ERROR_CODES, HTTP_STATUS, createError } = require("./errors");

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 1000;
const REQUIRED_OPTION_KEYS = ["uppercase", "lowercase", "numbers", "symbols"];
const VALID_COMPLIANCE = Object.keys(settings.compliance_profiles);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidBodyError() {
  return {
    ok: false,
    error: createError(ERROR_CODES.INVALID_BODY, undefined, HTTP_STATUS.VALIDATION),
  };
}

function validateGenerateRequest(request) {
  if (!isObject(request) || !isObject(request.body)) {
    return invalidBodyError();
  }

  const { body } = request;
  const { length, quantity, options, compliance } = body;

  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_LENGTH, undefined, HTTP_STATUS.VALIDATION),
    };
  }

  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_QUANTITY, undefined, HTTP_STATUS.VALIDATION),
    };
  }

  if (!isObject(options)) {
    return invalidBodyError();
  }

  const hasAnyCharset = REQUIRED_OPTION_KEYS.some((key) => options[key] === true);
  if (!hasAnyCharset) {
    return {
      ok: false,
      error: createError(ERROR_CODES.NO_CHARSET, undefined, HTTP_STATUS.VALIDATION),
    };
  }

  if (typeof compliance !== "string" || !VALID_COMPLIANCE.includes(compliance)) {
    return {
      ok: false,
      error: createError(
        ERROR_CODES.INVALID_COMPLIANCE,
        undefined,
        HTTP_STATUS.VALIDATION,
        VALID_COMPLIANCE
      ),
    };
  }

  return {
    ok: true,
    value: {
      length,
      quantity,
      options: {
        uppercase: Boolean(options.uppercase),
        lowercase: Boolean(options.lowercase),
        numbers: Boolean(options.numbers),
        symbols: Boolean(options.symbols),
        exclude_ambiguous: Boolean(options.exclude_ambiguous),
      },
      compliance,
    },
  };
}

module.exports = {
  validateGenerateRequest,
  VALID_COMPLIANCE,
};
