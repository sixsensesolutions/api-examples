const crypto = require("crypto");
const { DynamoDBClient, QueryCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamodbClient = new DynamoDBClient({});
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event || typeof event.body !== "string") {
    throw new Error("INVALID_BODY");
  }
  return JSON.parse(event.body);
}

function emailDomain(email) {
  const parts = String(email || "").split("@");
  return parts.length === 2 ? parts[1] : "invalid";
}

async function handler(event) {
  let body;
  try {
    body = parseBody(event);
  } catch (error) {
    return buildResponse(400, {
      error: "INVALID_BODY",
      message: "Request body must be valid JSON.",
    });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!name) {
    return buildResponse(400, {
      error: "INVALID_NAME",
      message: "Name is required.",
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return buildResponse(400, {
      error: "INVALID_EMAIL",
      message: "Email is required and must be valid.",
    });
  }

  const tableName = process.env.DYNAMODB_TABLE || "spg-api-keys";

  try {
    const existing = await dynamodbClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "customer_id-index",
        KeyConditionExpression: "customer_id = :email",
        ExpressionAttributeValues: {
          ":email": { S: email },
        },
        Limit: 1,
      })
    );

    if (existing.Items && existing.Items.length > 0) {
      console.info("signup_duplicate", { email_domain: emailDomain(email) });
      return buildResponse(409, {
        error: "ALREADY_REGISTERED",
        message: "An API key already exists for this email address.",
      });
    }

    const apiKey = `sss_free_${crypto.randomBytes(16).toString("hex")}`;
    const createdAt = new Date().toISOString();

    await dynamodbClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          api_key: { S: apiKey },
          customer_id: { S: email },
          customer_name: { S: name },
          tier: { S: "free" },
          calls_this_month: { N: "0" },
          monthly_limit: { N: "500" },
          created_at: { S: createdAt },
        },
      })
    );

    console.info("signup_success", { email_domain: emailDomain(email) });
    return buildResponse(200, {
      api_key: apiKey,
      message: "Your free API key is ready. You have 500 calls per month.",
      tier: "free",
      monthly_limit: 500,
      docs_url: "https://www.sixsensesolutions.net/api-reference/",
    });
  } catch (error) {
    console.info("signup_error", { email_domain: emailDomain(email) });
    return buildResponse(500, {
      error: "SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    });
  }
}

module.exports = {
  handler,
};
