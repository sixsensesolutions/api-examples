const mockSend = jest.fn();
const mockDdbClientCtor = jest.fn(() => ({ send: mockSend }));

jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: function DynamoDBClient(...args) {
      mockDdbClientCtor(...args);
      return { send: mockSend };
    },
    GetItemCommand: function GetItemCommand(input) {
      this.input = input;
    },
    UpdateItemCommand: function UpdateItemCommand(input) {
      this.input = input;
    },
  };
});

describe("auth service", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockDdbClientCtor.mockClear();
    process.env.DYNAMODB_TABLE = "spg-api-keys";
  });

  test("DynamoDB client is instantiated outside handler function", async () => {
    const { authenticateRequest } = require("../../src/services/auth");

    expect(mockDdbClientCtor).toHaveBeenCalledTimes(1);

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "abcdefghijklmno" },
          customer_id: { S: "cust_1" },
          tier: { S: "pro" },
          calls_this_month: { N: "10" },
          monthly_limit: { N: "100" },
        },
      })
      .mockResolvedValueOnce({});

    await authenticateRequest({ authorization: "Bearer abcdefghijklmno" });
    await authenticateRequest({ authorization: "Bearer abcdefghijklmno" });

    expect(mockDdbClientCtor).toHaveBeenCalledTimes(1);
  });

  test("missing Authorization header returns 401 MISSING_AUTH", async () => {
    const { authenticateRequest } = require("../../src/services/auth");
    const { ERROR_CODES } = require("../../src/utils/errors");

    const result = await authenticateRequest({});

    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.MISSING_AUTH);
    expect(result.error.status).toBe(401);
  });

  test("invalid API key returns 401 INVALID_KEY", async () => {
    const { authenticateRequest } = require("../../src/services/auth");
    const { ERROR_CODES } = require("../../src/utils/errors");

    mockSend.mockResolvedValueOnce({});

    const result = await authenticateRequest({
      authorization: "Bearer invalid-key",
    });

    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_KEY);
    expect(result.error.status).toBe(401);
  });

  test("exhausted rate limit returns 429 RATE_LIMIT_EXCEEDED with calls_remaining 0", async () => {
    const { authenticateRequest } = require("../../src/services/auth");
    const { ERROR_CODES } = require("../../src/utils/errors");

    mockSend.mockResolvedValueOnce({
      Item: {
        api_key: { S: "key-12345678" },
        customer_id: { S: "cust_2" },
        tier: { S: "free" },
        calls_this_month: { N: "500" },
        monthly_limit: { N: "500" },
      },
    });

    const result = await authenticateRequest({
      authorization: "Bearer key-12345678",
    });

    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    expect(result.error.status).toBe(429);
    expect(result.error.calls_remaining).toBe(0);
  });

  test("valid key returns customer_id, tier, and correct calls_remaining", async () => {
    const { authenticateRequest } = require("../../src/services/auth");

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "abcd1234zzzz" },
          customer_id: { S: "cust_3" },
          tier: { S: "business" },
          calls_this_month: { N: "20" },
          monthly_limit: { N: "100" },
        },
      })
      .mockResolvedValueOnce({});

    const result = await authenticateRequest({
      authorization: "Bearer abcd1234zzzz",
    });

    expect(result.ok).toBe(true);
    expect(result.value.customer_id).toBe("cust_3");
    expect(result.value.tier).toBe("business");
    expect(result.value.calls_remaining).toBe(79);
  });
});

describe("getApiKeyContext", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockDdbClientCtor.mockClear();
    process.env.DYNAMODB_TABLE = "spg-api-keys";
  });

  test("returns api_key_id as first 8 chars without incrementing usage", async () => {
    const { getApiKeyContext } = require("../../src/services/auth");

    mockSend.mockResolvedValueOnce({
      Item: {
        api_key: { S: "abcdefghijkl" },
        customer_id: { S: "cust_x" },
        tier: { S: "pro" },
        calls_this_month: { N: "5" },
        monthly_limit: { N: "100" },
      },
    });

    const result = await getApiKeyContext({
      authorization: "Bearer abcdefghijkl",
    });

    expect(result.ok).toBe(true);
    expect(result.value.api_key_id).toBe("abcdefgh");
    expect(result.value.calls_remaining).toBe(95);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe("logger service", () => {
  test("logger never writes full API key and never writes passwords", () => {
    const { createLogRecord } = require("../../src/services/logger");

    const record = createLogRecord({
      api_key: "abcd1234SECRETKEY",
      length_requested: 20,
      quantity_requested: 5,
      compliance_profile: "NIST",
      response_time_ms: 43,
      success: true,
      passwords: ["should-never-log"],
    });

    expect(record.api_key_id).toBe("abcd1234");
    expect(record.api_key).toBeUndefined();
    expect(record.passwords).toBeUndefined();
  });
});
