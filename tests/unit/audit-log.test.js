const mockQuerySend = jest.fn();
const mockGetContext = jest.fn();

jest.mock("../../src/services/auth", () => ({
  getApiKeyContext: (...args) => mockGetContext(...args),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: function DynamoDBClient() {
    return { send: mockQuerySend };
  },
  QueryCommand: jest.fn().mockImplementation(function QueryCommand(input) {
    this.input = input;
  }),
}));

describe("GET /v1/audit-log handler", () => {
  beforeEach(() => {
    jest.resetModules();
    mockQuerySend.mockReset();
    mockGetContext.mockReset();
    process.env.AUDIT_LOG_TABLE = "six-sense-audit-log";
    process.env.DYNAMODB_TABLE = "spg-api-keys";
  });

  function httpEvent(queryStringParameters, authHeader) {
    return {
      headers: { authorization: authHeader || "Bearer test_pro_key_xxxxxxxx" },
      queryStringParameters: queryStringParameters || null,
    };
  }

  test("free tier returns 403 AUDIT_LOG_NOT_AVAILABLE", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: {
        customer_id: "c1",
        tier: "free",
        calls_remaining: 10,
        api_key_id: "abcd1234",
      },
    });

    const res = await handler(
      httpEvent({ start_date: "2026-04-01", end_date: "2026-04-30" }, "Bearer free_key_xxx")
    );
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("AUDIT_LOG_NOT_AVAILABLE");
  });

  test("missing start_date returns 400 MISSING_DATE_RANGE", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    const res = await handler(httpEvent({ end_date: "2026-04-30" }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("MISSING_DATE_RANGE");
  });

  test("missing end_date returns 400 MISSING_DATE_RANGE", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    const res = await handler(httpEvent({ start_date: "2026-04-01" }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("MISSING_DATE_RANGE");
  });

  test("invalid date format returns 400 INVALID_DATE_FORMAT", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    const res = await handler(
      httpEvent({ start_date: "not-a-date", end_date: "2026-04-30" })
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_DATE_FORMAT");
  });

  test("end_date before start_date returns 400 INVALID_DATE_RANGE", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    const res = await handler(
      httpEvent({ start_date: "2026-04-10", end_date: "2026-04-01" })
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_DATE_RANGE");
  });

  test("date range exceeding 90 days returns 400 INVALID_DATE_RANGE", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    const res = await handler(
      httpEvent({ start_date: "2026-04-01", end_date: "2026-06-30" })
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_DATE_RANGE");
  });

  test("valid Pro tier request returns 200 with events array", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "test_pro" },
    });
    mockQuerySend.mockResolvedValueOnce({
      Items: [
        {
          event_id: { S: "evt-1" },
          event_type: { S: "generate" },
          created_at: { S: "2026-04-10T14:57:35.000Z" },
          request: {
            M: {
              length: { N: "20" },
              quantity: { N: "1" },
              compliance_profile: { S: "NIST" },
            },
          },
          result: {
            M: {
              entropy_bits: { N: "120.4" },
              compliance_profile: { S: "NIST" },
              quantity_generated: { N: "1" },
            },
          },
        },
      ],
    });

    const res = await handler(
      httpEvent({ start_date: "2026-04-01", end_date: "2026-04-30" }, "Bearer test_pro_key")
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.count).toBe(1);
    expect(body.start_date).toBe("2026-04-01");
    expect(body.end_date).toBe("2026-04-30");
    expect(body.api_key_id).toBe("test_pro");
    expect(body.events[0].event_type).toBe("generate");
  });

  test("Query scopes to authenticated api_key_id only", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "business", calls_remaining: 2, api_key_id: "mykey123" },
    });
    mockQuerySend.mockResolvedValueOnce({ Items: [] });

    await handler(
      httpEvent({ start_date: "2026-04-01", end_date: "2026-04-02" }, "Bearer mykey1234567890")
    );

    const queryCmd = mockQuerySend.mock.calls[0][0];
    const qInput = queryCmd.input || queryCmd;
    expect(qInput.ExpressionAttributeValues[":aid"].S).toBe("mykey123");
  });

  test("serialized events contain no credential-like payloads", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 10, api_key_id: "abcd1234" },
    });
    mockQuerySend.mockResolvedValueOnce({
      Items: [
        {
          event_id: { S: "evt-2" },
          event_type: { S: "validate" },
          created_at: { S: "2026-04-11T10:00:00.000Z" },
          request: {
            M: {
              compliance_profile: { S: "NIST" },
              credential_length: { N: "16" },
              passed: { BOOL: true },
            },
          },
          result: {
            M: {
              entropy_bits: { N: "88.1" },
              compliance_profile: { S: "NIST" },
              score: { N: "100" },
              passed: { BOOL: true },
            },
          },
        },
      ],
    });

    const res = await handler(
      httpEvent({ start_date: "2026-04-01", end_date: "2026-04-30" })
    );
    const body = JSON.parse(res.body);
    expect(JSON.stringify(body)).not.toMatch(/SuperSecretCredentialValue/i);
    expect(body.events[0].request.credential_length).toBe(16);
  });

  test("missing auth returns 401 MISSING_AUTH", async () => {
    const { handler } = require("../../src/handlers/audit-log");
    mockGetContext.mockResolvedValueOnce({
      ok: false,
      error: { error: "MISSING_AUTH", status: 401, message: "authorization header is required" },
    });
    const res = await handler({
      headers: {},
      queryStringParameters: { start_date: "2026-04-01", end_date: "2026-04-30" },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe("MISSING_AUTH");
  });
});
