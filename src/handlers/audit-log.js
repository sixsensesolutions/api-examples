const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { getApiKeyContext } = require("../services/auth");
const { ERROR_CODES, HTTP_STATUS, createError } = require("../utils/errors");

const dynamodbClient = new DynamoDBClient({});

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

function isCalendarDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function utcMidnightParts(isoDate) {
  const parts = isoDate.split("-").map((p) => Number(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [y, m, d] = parts;
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return ms;
}

function parseDateRange(startDate, endDate) {
  if (!isCalendarDateString(startDate) || !isCalendarDateString(endDate)) {
    return { ok: false, error: ERROR_CODES.INVALID_DATE_FORMAT };
  }

  const startMs = utcMidnightParts(startDate);
  const endMs = utcMidnightParts(endDate);
  if (startMs === null || endMs === null) {
    return { ok: false, error: ERROR_CODES.INVALID_DATE_FORMAT };
  }

  const endExclusive = endMs + 86400000;
  if (endExclusive <= startMs) {
    return { ok: false, error: ERROR_CODES.INVALID_DATE_RANGE };
  }

  if (endExclusive - startMs > 90 * 86400000) {
    return { ok: false, error: ERROR_CODES.INVALID_DATE_RANGE };
  }

  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endExclusive - 1).toISOString();

  return { ok: true, startIso, endIso };
}

function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return 100;
  }
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) {
    return 100;
  }
  return Math.min(1000, Math.max(1, n));
}

function numFromAttr(attr) {
  if (!attr || typeof attr.N !== "string") {
    return undefined;
  }
  const value = Number(attr.N);
  return Number.isFinite(value) ? value : undefined;
}

function strFromAttr(attr) {
  return attr && typeof attr.S === "string" ? attr.S : undefined;
}

function mapFromAttr(attr) {
  if (!attr || !attr.M || typeof attr.M !== "object") {
    return {};
  }
  const out = {};
  Object.keys(attr.M).forEach((key) => {
    const v = attr.M[key];
    if (v && typeof v.N === "string") {
      out[key] = numFromAttr(v);
    } else if (v && typeof v.S === "string") {
      out[key] = v.S;
    } else if (v && typeof v.BOOL === "boolean") {
      out[key] = v.BOOL;
    }
  });
  return out;
}

function mapItemToEvent(item) {
  const eventType = strFromAttr(item.event_type);
  const eventId = strFromAttr(item.event_id);
  const createdAt = strFromAttr(item.created_at);
  const request = mapFromAttr(item.request);
  const result = mapFromAttr(item.result);

  return {
    event_id: eventId,
    event_type: eventType,
    created_at: createdAt,
    request,
    result,
  };
}

function tierAllowsAuditLog(tier) {
  return typeof tier === "string" && tier.toLowerCase() !== "free";
}

async function handler(event) {
  const authorization = extractAuthorization(event && event.headers);
  const authResult = await getApiKeyContext({ authorization });
  if (!authResult.ok) {
    const err = authResult.error;
    return buildResponse(err.status || HTTP_STATUS.AUTH, err);
  }

  if (!tierAllowsAuditLog(authResult.value.tier)) {
    return buildResponse(
      HTTP_STATUS.FORBIDDEN,
      createError(ERROR_CODES.AUDIT_LOG_NOT_AVAILABLE, undefined, HTTP_STATUS.FORBIDDEN)
    );
  }

  const qs = (event && event.queryStringParameters) || {};
  const startDate = qs.start_date;
  const endDate = qs.end_date;

  if (!startDate || !endDate) {
    return buildResponse(
      HTTP_STATUS.VALIDATION,
      createError(ERROR_CODES.MISSING_DATE_RANGE, undefined, HTTP_STATUS.VALIDATION)
    );
  }

  const range = parseDateRange(startDate, endDate);
  if (!range.ok) {
    return buildResponse(
      HTTP_STATUS.VALIDATION,
      createError(range.error, undefined, HTTP_STATUS.VALIDATION)
    );
  }

  const eventTypeFilter =
    typeof qs.event_type === "string" && (qs.event_type === "generate" || qs.event_type === "validate")
      ? qs.event_type
      : undefined;

  const limit = parseLimit(qs.limit);
  const table = process.env.AUDIT_LOG_TABLE;
  if (!table) {
    return buildResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      createError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "audit log table not configured",
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    );
  }

  const apiKeyId = authResult.value.api_key_id;

  const expressionAttributeValues = {
    ":aid": { S: apiKeyId },
    ":start": { S: range.startIso },
    ":end": { S: range.endIso },
  };

  let filterExpression;
  if (eventTypeFilter) {
    filterExpression = "event_type = :et";
    expressionAttributeValues[":et"] = { S: eventTypeFilter };
  }

  const queryInput = {
    TableName: table,
    IndexName: "api_key_id-created_at-index",
    KeyConditionExpression: "api_key_id = :aid AND created_at BETWEEN :start AND :end",
    ExpressionAttributeValues: expressionAttributeValues,
    ScanIndexForward: false,
    Limit: limit,
  };

  if (filterExpression) {
    queryInput.FilterExpression = filterExpression;
  }

  let queryResult;
  try {
    queryResult = await dynamodbClient.send(new QueryCommand(queryInput));
  } catch (err) {
    return buildResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      createError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "audit log query failed",
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    );
  }

  const items = queryResult.Items || [];
  const events = items.map(mapItemToEvent);

  return buildResponse(200, {
    events,
    count: events.length,
    start_date: startDate,
    end_date: endDate,
    api_key_id: apiKeyId,
  });
}

module.exports = { handler };
