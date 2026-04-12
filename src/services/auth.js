const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { ERROR_CODES, HTTP_STATUS, createError } = require("../utils/errors");

const dynamodbClient = new DynamoDBClient({});

function parseAuthorizationHeader(headers) {
  if (!headers || typeof headers.authorization !== "string") {
    return null;
  }

  const match = headers.authorization.match(/^Bearer\s+(.+)$/);
  if (!match || !match[1]) {
    return null;
  }

  return match[1].trim();
}

function itemString(item, key) {
  return item && item[key] && typeof item[key].S === "string" ? item[key].S : "";
}

function itemNumber(item, key) {
  if (!item || !item[key] || typeof item[key].N !== "string") {
    return 0;
  }

  const value = Number(item[key].N);
  return Number.isFinite(value) ? value : 0;
}

async function authenticateRequest(headers) {
  const apiKey = parseAuthorizationHeader(headers);
  if (!apiKey) {
    return {
      ok: false,
      error: createError(ERROR_CODES.MISSING_AUTH, undefined, HTTP_STATUS.AUTH),
    };
  }

  const tableName = process.env.DYNAMODB_TABLE;

  const getResult = await dynamodbClient.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        api_key: { S: apiKey },
      },
      ConsistentRead: true,
    })
  );

  if (!getResult || !getResult.Item) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_KEY, undefined, HTTP_STATUS.AUTH),
    };
  }

  const customerId = itemString(getResult.Item, "customer_id");
  const tier = itemString(getResult.Item, "tier");
  const callsThisMonth = itemNumber(getResult.Item, "calls_this_month");
  const monthlyLimit = itemNumber(getResult.Item, "monthly_limit");

  if (monthlyLimit >= 0 && callsThisMonth >= monthlyLimit) {
    return {
      ok: false,
      error: {
        ...createError(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          undefined,
          HTTP_STATUS.RATE_LIMIT
        ),
        calls_remaining: 0,
      },
    };
  }

  await dynamodbClient.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: {
        api_key: { S: apiKey },
      },
      UpdateExpression: "ADD calls_this_month :increment",
      ExpressionAttributeValues: {
        ":increment": { N: "1" },
      },
    })
  );

  const callsRemaining = monthlyLimit < 0 ? -1 : Math.max(0, monthlyLimit - (callsThisMonth + 1));

  return {
    ok: true,
    value: {
      customer_id: customerId,
      tier,
      calls_remaining: callsRemaining,
    },
  };
}

function apiKeyIdFromRawKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return "";
  }
  return apiKey.length >= 8 ? apiKey.slice(0, 8) : apiKey;
}

async function getApiKeyContext(headers) {
  const apiKey = parseAuthorizationHeader(headers);
  if (!apiKey) {
    return {
      ok: false,
      error: createError(ERROR_CODES.MISSING_AUTH, undefined, HTTP_STATUS.AUTH),
    };
  }

  const tableName = process.env.DYNAMODB_TABLE;

  const getResult = await dynamodbClient.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        api_key: { S: apiKey },
      },
      ConsistentRead: true,
    })
  );

  if (!getResult || !getResult.Item) {
    return {
      ok: false,
      error: createError(ERROR_CODES.INVALID_KEY, undefined, HTTP_STATUS.AUTH),
    };
  }

  const customerId = itemString(getResult.Item, "customer_id");
  const tier = itemString(getResult.Item, "tier");
  const callsThisMonth = itemNumber(getResult.Item, "calls_this_month");
  const monthlyLimit = itemNumber(getResult.Item, "monthly_limit");
  const callsRemaining =
    monthlyLimit < 0 ? -1 : Math.max(0, monthlyLimit - callsThisMonth);

  return {
    ok: true,
    value: {
      customer_id: customerId,
      tier,
      calls_remaining: callsRemaining,
      api_key_id: apiKeyIdFromRawKey(apiKey),
    },
  };
}

module.exports = {
  authenticateRequest,
  getApiKeyContext,
};
