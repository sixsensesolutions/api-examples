const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { randomUUID } = require("crypto");

const dynamodbClient = new DynamoDBClient({});

function strAttr(value) {
  return { S: String(value) };
}

function numAttr(value) {
  return { N: String(value) };
}

function boolAttr(value) {
  return { BOOL: Boolean(value) };
}

function mapAttr(obj) {
  const out = {};
  Object.keys(obj).forEach((key) => {
    const v = obj[key];
    if (v === undefined || v === null) {
      return;
    }
    if (typeof v === "boolean") {
      out[key] = boolAttr(v);
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = numAttr(v);
    } else if (typeof v === "string") {
      out[key] = strAttr(v);
    }
  });
  return { M: out };
}

async function writeAuditEvent(payload) {
  const table = process.env.AUDIT_LOG_TABLE;
  if (!table) {
    return;
  }

  const {
    event_type,
    api_key_id,
    customer_id,
    tier,
    request,
    result,
  } = payload;

  if (!api_key_id || !event_type || !customer_id || !tier) {
    return;
  }

  const eventId = randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

  const item = {
    api_key_id: strAttr(api_key_id),
    event_id: strAttr(eventId),
    event_type: strAttr(event_type),
    customer_id: strAttr(customer_id),
    tier: strAttr(tier),
    created_at: strAttr(createdAt),
    expires_at: numAttr(expiresAt),
    request: mapAttr(request),
    result: mapAttr(result),
  };

  await dynamodbClient.send(
    new PutItemCommand({
      TableName: table,
      Item: item,
    })
  );
}

module.exports = {
  writeAuditEvent,
};
