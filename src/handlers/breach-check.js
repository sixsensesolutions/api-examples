const crypto = require("crypto");
const { authenticateRequest } = require("../services/auth");
const { ERROR_CODES, HTTP_STATUS, createError } = require("../utils/errors");

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
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

function riskRating(count) {
  if (count <= 0) {
    return "low";
  }
  if (count <= 10) {
    return "medium";
  }
  if (count <= 100) {
    return "high";
  }
  return "critical";
}

async function queryHibp(hashUpper) {
  const prefix = hashUpper.slice(0, 5);
  const suffix = hashUpper.slice(5);
  const url = `https://api.pwnedpasswords.com/range/${prefix}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "SixSenseSolutions-API-BreachCheck",
    },
  });

  if (!response.ok) {
    throw new Error("hibp_unavailable");
  }

  const text = await response.text();
  const lines = text.split("\n");
  let exposureCount = 0;
  let matched = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const lineSuffix = trimmed.slice(0, colon).toUpperCase();
    const countPart = trimmed.slice(colon + 1);
    const count = Number.parseInt(countPart, 10);
    if (lineSuffix === suffix) {
      matched = true;
      exposureCount = Number.isFinite(count) ? count : 0;
      break;
    }
  }

  return { prefix, suffix, matched, exposureCount };
}

async function handler(event) {
  const authorization = extractAuthorization(event && event.headers);
  let body;

  try {
    body = parseBody(event ? event.body : undefined, Boolean(event && event.isBase64Encoded));
  } catch (err) {
    return buildResponse(
      HTTP_STATUS.VALIDATION,
      createError(ERROR_CODES.INVALID_BODY, undefined, HTTP_STATUS.VALIDATION)
    );
  }

  const authResult = await authenticateRequest({ authorization });
  if (!authResult.ok) {
    const err = authResult.error;
    return buildResponse(err.status || HTTP_STATUS.AUTH, err);
  }

  const credential = body && body.credential;
  if (typeof credential !== "string" || credential.length === 0) {
    return buildResponse(
      HTTP_STATUS.VALIDATION,
      createError(ERROR_CODES.INVALID_CREDENTIAL, undefined, HTTP_STATUS.VALIDATION)
    );
  }

  const hashUpper = crypto.createHash("sha1").update(credential, "utf8").digest("hex").toUpperCase();

  let prefix;
  let exposed;
  let exposureCount;
  let risk;

  try {
    const result = await queryHibp(hashUpper);
    prefix = result.prefix;
    exposed = result.matched;
    exposureCount = result.matched ? result.exposureCount : 0;
    risk = riskRating(exposureCount);
  } catch (err) {
    return buildResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      createError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "breach check service is temporarily unavailable",
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    );
  }

  console.info("breach_check_request", {
    timestamp: new Date().toISOString(),
    exposed,
    exposure_count: exposureCount,
    risk_rating: risk,
    hibp_hash_prefix: prefix,
  });

  const checkedAt = new Date().toISOString();

  if (!exposed) {
    return buildResponse(200, {
      exposed: false,
      exposure_count: 0,
      risk_rating: "low",
      checked_at: checkedAt,
      note: "This credential does not appear in known breach databases. This does not guarantee it is secure.",
    });
  }

  return buildResponse(200, {
    exposed: true,
    exposure_count: exposureCount,
    risk_rating: risk,
    checked_at: checkedAt,
    note: "This credential appears in known breach databases. Do not use it.",
  });
}

module.exports = { handler };
