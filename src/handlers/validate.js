const { authenticateRequest } = require("../services/auth");
const { writeAuditEvent } = require("../services/audit-store");
const { ERROR_CODES, HTTP_STATUS, createError } = require("../utils/errors");

const AMBIGUOUS_RE = /[O0Il1|]/;

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

function charsetSizeFromClasses(hasUppercase, hasLowercase, hasNumbers, hasSymbols) {
  let size = 0;
  if (hasUppercase) size += 26;
  if (hasLowercase) size += 26;
  if (hasNumbers) size += 10;
  if (hasSymbols) size += 33;
  return Math.max(size, 2);
}

function entropyBits(charsetSize, length) {
  const bits = Math.log2(charsetSize) * length;
  if (!Number.isFinite(bits)) {
    return 0;
  }
  return Math.round(bits * 10) / 10;
}

function mergePolicy(policyInput) {
  const raw = policyInput && typeof policyInput === "object" ? policyInput : {};
  const compliance = typeof raw.compliance === "string" ? raw.compliance : null;

  let merged = {
    min_length: typeof raw.min_length === "number" ? raw.min_length : 12,
    require_uppercase: raw.require_uppercase !== false,
    require_lowercase: raw.require_lowercase !== false,
    require_numbers: raw.require_numbers !== false,
    require_symbols: Boolean(raw.require_symbols),
    min_entropy_bits: typeof raw.min_entropy_bits === "number" ? raw.min_entropy_bits : 60,
    compliance: compliance || undefined,
  };

  if (compliance === "NIST") {
    merged = {
      min_length: 15,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: true,
      min_entropy_bits: 80,
      compliance: "NIST",
    };
  } else if (compliance === "SOC2") {
    merged = {
      min_length: 12,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: false,
      min_entropy_bits: 60,
      compliance: "SOC2",
    };
  } else if (compliance === "strong") {
    merged = {
      min_length: 8,
      require_uppercase: raw.require_uppercase !== false,
      require_lowercase: raw.require_lowercase !== false,
      require_numbers: raw.require_numbers !== false,
      require_symbols: Boolean(raw.require_symbols),
      min_entropy_bits: 40,
      compliance: "strong",
    };
  }

  return merged;
}

function analyzeCredential(credential) {
  const hasUppercase = /[A-Z]/.test(credential);
  const hasLowercase = /[a-z]/.test(credential);
  const hasNumbers = /[0-9]/.test(credential);
  const hasSymbols = /[^A-Za-z0-9]/.test(credential);
  const hasAmbiguous = AMBIGUOUS_RE.test(credential);
  const charsetSize = charsetSizeFromClasses(hasUppercase, hasLowercase, hasNumbers, hasSymbols);
  const length = credential.length;
  const entropy = entropyBits(charsetSize, length);

  return {
    length,
    entropy_bits: entropy,
    has_uppercase: hasUppercase,
    has_lowercase: hasLowercase,
    has_numbers: hasNumbers,
    has_symbols: hasSymbols,
    has_ambiguous: hasAmbiguous,
    charset_size: charsetSize,
  };
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

  const credential = body && body.credential;
  if (typeof credential !== "string" || credential.length === 0) {
    return buildResponse(
      HTTP_STATUS.VALIDATION,
      createError(ERROR_CODES.INVALID_CREDENTIAL, undefined, HTTP_STATUS.VALIDATION)
    );
  }

  const authResult = await authenticateRequest({ authorization });
  if (!authResult.ok) {
    const err = authResult.error;
    return buildResponse(err.status || HTTP_STATUS.AUTH, err);
  }

  const policy = mergePolicy(body.policy);
  const analysis = analyzeCredential(credential);
  const failures = [];

  const lengthPassed = analysis.length >= policy.min_length;
  if (!lengthPassed) {
    failures.push(
      `Length ${analysis.length} is below required minimum of ${policy.min_length}`
    );
  }

  const entropyPassed = analysis.entropy_bits >= policy.min_entropy_bits;
  if (!entropyPassed) {
    failures.push(
      `Entropy ${analysis.entropy_bits.toFixed(1)} bits is below required minimum of ${policy.min_entropy_bits}`
    );
  }

  const upperPassed = !policy.require_uppercase || analysis.has_uppercase;
  if (!upperPassed) {
    failures.push("Missing required character type: uppercase");
  }

  const lowerPassed = !policy.require_lowercase || analysis.has_lowercase;
  if (!lowerPassed) {
    failures.push("Missing required character type: lowercase");
  }

  const numPassed = !policy.require_numbers || analysis.has_numbers;
  if (!numPassed) {
    failures.push("Missing required character type: numbers");
  }

  const symPassed = !policy.require_symbols || analysis.has_symbols;
  if (!symPassed) {
    failures.push("Missing required character type: symbols");
  }

  const policyResults = {
    length: {
      required: policy.min_length,
      actual: analysis.length,
      passed: lengthPassed,
    },
    entropy_bits: {
      required: policy.min_entropy_bits,
      actual: analysis.entropy_bits,
      passed: entropyPassed,
    },
    uppercase: {
      required: policy.require_uppercase,
      actual: analysis.has_uppercase,
      passed: upperPassed,
    },
    lowercase: {
      required: policy.require_lowercase,
      actual: analysis.has_lowercase,
      passed: lowerPassed,
    },
    numbers: {
      required: policy.require_numbers,
      actual: analysis.has_numbers,
      passed: numPassed,
    },
    symbols: {
      required: policy.require_symbols,
      actual: analysis.has_symbols,
      passed: symPassed,
    },
  };

  const checks = [
    lengthPassed,
    entropyPassed,
    upperPassed,
    lowerPassed,
    numPassed,
    symPassed,
  ];
  const failedCount = checks.filter((c) => !c).length;
  const passed = failedCount === 0;
  const score = Math.max(0, Math.min(100, 100 - failedCount * 20));

  const complianceProfile = policy.compliance || null;

  console.info("validate_request", {
    timestamp: new Date().toISOString(),
    credential_length: analysis.length,
    compliance_profile: complianceProfile,
    passed,
    score,
  });

  const authHeader = extractAuthorization(event && event.headers) || "";
  const rawApiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  const apiKeyId = rawApiKey.length >= 8 ? rawApiKey.slice(0, 8) : rawApiKey;
  try {
    await writeAuditEvent({
      event_type: "validate",
      api_key_id: apiKeyId,
      customer_id: authResult.value.customer_id,
      tier: authResult.value.tier,
      request: {
        compliance_profile: complianceProfile || "",
        credential_length: analysis.length,
        passed,
      },
      result: {
        entropy_bits: analysis.entropy_bits,
        compliance_profile: complianceProfile || "",
        score,
        passed,
      },
    });
  } catch (auditErr) {
    console.error("audit_write_failed", { name: auditErr.name || "error" });
  }

  return buildResponse(200, {
    passed,
    score,
    credential_analysis: {
      length: analysis.length,
      entropy_bits: analysis.entropy_bits,
      has_uppercase: analysis.has_uppercase,
      has_lowercase: analysis.has_lowercase,
      has_numbers: analysis.has_numbers,
      has_symbols: analysis.has_symbols,
      has_ambiguous: analysis.has_ambiguous,
      charset_size: analysis.charset_size,
    },
    policy_results: policyResults,
    compliance_profile: complianceProfile,
    failures,
    validated_at: new Date().toISOString(),
  });
}

module.exports = { handler };
