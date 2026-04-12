const generatePasswords = require("../services/generator");
const calculateEntropy = require("../services/entropy");
const { authenticateRequest } = require("../services/auth");
const { writeAuditEvent } = require("../services/audit-store");
const { logRequest } = require("../services/logger");
const { validateGenerateRequest } = require("../utils/validators");
const { ERROR_CODES, HTTP_STATUS, createError } = require("../utils/errors");

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function extractAuthorization(headers) {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  if (typeof headers.authorization === "string") {
    return headers.authorization;
  }

  if (typeof headers.Authorization === "string") {
    return headers.Authorization;
  }

  return undefined;
}

function parseBody(rawBody, isBase64Encoded) {
  if (typeof rawBody === "string") {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      if (isBase64Encoded) {
        const decoded = Buffer.from(rawBody, "base64").toString("utf8");
        return JSON.parse(decoded);
      }
      throw error;
    }
  }

  if (rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)) {
    return rawBody;
  }

  throw new Error("Malformed body");
}

function safeLog(record) {
  try {
    logRequest(record);
  } catch (err) {
    // Logging must never break request handling.
  }
}

async function handler(event) {
  const startedAt = Date.now();
  const generatedAt = new Date().toISOString();
  const authorization = extractAuthorization(event && event.headers);
  let parsedBody;

  try {
    parsedBody = parseBody(event ? event.body : undefined, Boolean(event && event.isBase64Encoded));
  } catch (err) {
    const error = createError(ERROR_CODES.INVALID_BODY, undefined, HTTP_STATUS.VALIDATION);
    safeLog({
      api_key: "",
      length_requested: undefined,
      quantity_requested: undefined,
      compliance_profile: undefined,
      response_time_ms: Date.now() - startedAt,
      success: false,
      error_code: error.error,
    });
    return buildResponse(error.status, error);
  }

  const validation = validateGenerateRequest({ body: parsedBody });
  if (!validation.ok) {
    safeLog({
      api_key: "",
      length_requested: parsedBody.length,
      quantity_requested: parsedBody.quantity,
      compliance_profile: parsedBody.compliance,
      response_time_ms: Date.now() - startedAt,
      success: false,
      error_code: validation.error.error,
    });
    return buildResponse(validation.error.status, validation.error);
  }

  const authResult = await authenticateRequest({ authorization });
  if (!authResult.ok) {
    safeLog({
      api_key: "",
      length_requested: parsedBody.length,
      quantity_requested: parsedBody.quantity,
      compliance_profile: parsedBody.compliance,
      response_time_ms: Date.now() - startedAt,
      success: false,
      error_code: authResult.error.error,
    });
    return buildResponse(authResult.error.status, authResult.error);
  }

  try {
    const generated = generatePasswords(validation.value);
    const entropyBits = calculateEntropy(generated.charset_size, generated.actual_length);

    const responseBody = {
      passwords: generated.passwords,
      meta: {
        length: generated.actual_length,
        entropy_bits: entropyBits,
        generated_at: generatedAt,
        compliance_profile: validation.value.compliance,
        calls_remaining: authResult.value.calls_remaining,
      },
    };

    safeLog({
      api_key: authorization ? authorization.replace(/^Bearer\s+/i, "") : "",
      length_requested: validation.value.length,
      quantity_requested: validation.value.quantity,
      compliance_profile: validation.value.compliance,
      response_time_ms: Date.now() - startedAt,
      success: true,
    });

    const rawKey = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const apiKeyId = rawKey.length >= 8 ? rawKey.slice(0, 8) : rawKey;
    try {
      await writeAuditEvent({
        event_type: "generate",
        api_key_id: apiKeyId,
        customer_id: authResult.value.customer_id,
        tier: authResult.value.tier,
        request: {
          length: validation.value.length,
          quantity: validation.value.quantity,
          compliance_profile: validation.value.compliance,
        },
        result: {
          entropy_bits: entropyBits,
          compliance_profile: validation.value.compliance,
          quantity_generated: generated.passwords.length,
        },
      });
    } catch (auditErr) {
      console.error("audit_write_failed", { name: auditErr.name || "error" });
    }

    return buildResponse(200, responseBody);
  } catch (err) {
    const error = createError(
      ERROR_CODES.INVALID_BODY,
      "internal server error",
      HTTP_STATUS.SERVER
    );
    safeLog({
      api_key: "",
      length_requested: parsedBody.length,
      quantity_requested: parsedBody.quantity,
      compliance_profile: parsedBody.compliance,
      response_time_ms: Date.now() - startedAt,
      success: false,
      error_code: error.error,
    });
    return buildResponse(error.status, error);
  }
}

module.exports = {
  handler,
};
