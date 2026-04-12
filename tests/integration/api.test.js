const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: function DynamoDBClient() {
      return { send: mockSend };
    },
    GetItemCommand: function GetItemCommand(input) {
      this.input = input;
    },
    UpdateItemCommand: function UpdateItemCommand(input) {
      this.input = input;
    },
    PutItemCommand: function PutItemCommand(input) {
      this.input = input;
    },
  };
});

describe("POST /v1/generate integration", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    process.env.DYNAMODB_TABLE = "spg-api-keys";
    process.env.AUDIT_LOG_TABLE = "six-sense-audit-log";
  });

  function eventWith(body, authHeader) {
    const event = {
      headers: {},
      body: JSON.stringify(body),
    };
    if (authHeader) {
      event.headers.authorization = authHeader;
    }
    return event;
  }

  test("happy path returns 200 with correct response shape", async () => {
    const { handler } = require("../../src/handlers/generate");

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "abcd1234realkey" },
          customer_id: { S: "cust_1" },
          tier: { S: "pro" },
          calls_this_month: { N: "1" },
          monthly_limit: { N: "50000" },
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await handler(
      eventWith(
        {
          length: 20,
          quantity: 5,
          options: {
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true,
            exclude_ambiguous: true,
          },
          compliance: "NIST",
        },
        "Bearer abcd1234realkey"
      )
    );

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.passwords)).toBe(true);
    expect(body.passwords).toHaveLength(5);
    expect(body.meta.compliance_profile).toBe("NIST");
    expect(typeof body.meta.calls_remaining).toBe("number");
    expect(typeof body.meta.entropy_bits).toBe("number");
    expect(body.meta.entropy_bits).toBeGreaterThan(0);
    expect(mockSend.mock.calls.length).toBeGreaterThanOrEqual(3);
    const putCmd = mockSend.mock.calls[2][0];
    expect(putCmd.constructor.name).toBe("PutItemCommand");
    const putInput = putCmd.input || putCmd;
    expect(putInput.TableName).toBe("six-sense-audit-log");
    expect(putInput.Item.event_type.S).toBe("generate");
    expect(putInput.Item.api_key_id.S).toBe("abcd1234");
    expect(JSON.stringify(putInput.Item)).not.toMatch(/xK9#|password|secret/i);
  });

  test("meta.generated_at is a valid ISO string", async () => {
    const { handler } = require("../../src/handlers/generate");

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "zzzz1111abcd" },
          customer_id: { S: "cust_2" },
          tier: { S: "pro" },
          calls_this_month: { N: "10" },
          monthly_limit: { N: "100" },
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await handler(
      eventWith(
        {
          length: 20,
          quantity: 2,
          options: {
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true,
            exclude_ambiguous: true,
          },
          compliance: "NIST",
        },
        "Bearer zzzz1111abcd"
      )
    );

    const generatedAt = JSON.parse(response.body).meta.generated_at;
    expect(new Date(generatedAt).toISOString()).toBe(generatedAt);
  });

  test("missing auth header returns 401 MISSING_AUTH", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler(
      eventWith({
        length: 20,
        quantity: 2,
        options: { uppercase: true, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
        compliance: "strong",
      })
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(401);
    expect(body.error).toBe("MISSING_AUTH");
  });

  test("invalid API key returns 401 INVALID_KEY", async () => {
    const { handler } = require("../../src/handlers/generate");
    mockSend.mockResolvedValueOnce({});

    const response = await handler(
      eventWith(
        {
          length: 20,
          quantity: 2,
          options: { uppercase: true, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "strong",
        },
        "Bearer invalid-key"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(401);
    expect(body.error).toBe("INVALID_KEY");
  });

  test("length below 8 returns 400 INVALID_LENGTH", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler(
      eventWith(
        {
          length: 7,
          quantity: 2,
          options: { uppercase: true, lowercase: false, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "strong",
        },
        "Bearer abcd1234"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("INVALID_LENGTH");
  });

  test("length above 128 returns 400 INVALID_LENGTH", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler(
      eventWith(
        {
          length: 129,
          quantity: 2,
          options: { uppercase: true, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "strong",
        },
        "Bearer abcd1234"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("INVALID_LENGTH");
  });

  test("no charset selected returns 400 NO_CHARSET", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler(
      eventWith(
        {
          length: 12,
          quantity: 2,
          options: { uppercase: false, lowercase: false, numbers: false, symbols: false, exclude_ambiguous: true },
          compliance: "strong",
        },
        "Bearer abcd1234"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("NO_CHARSET");
  });

  test("invalid compliance profile returns 400 INVALID_COMPLIANCE", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler(
      eventWith(
        {
          length: 12,
          quantity: 2,
          options: { uppercase: true, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "PCI",
        },
        "Bearer abcd1234"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("INVALID_COMPLIANCE");
  });

  test("NIST enforces minimum length 15 even when 12 requested", async () => {
    const { handler } = require("../../src/handlers/generate");

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "xxyyzz11abcd" },
          customer_id: { S: "cust_3" },
          tier: { S: "business" },
          calls_this_month: { N: "100" },
          monthly_limit: { N: "500000" },
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await handler(
      eventWith(
        {
          length: 12,
          quantity: 3,
          options: { uppercase: false, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "NIST",
        },
        "Bearer xxyyzz11abcd"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.meta.length).toBe(15);
    expect(body.passwords.every((p) => p.length === 15)).toBe(true);
  });

  test("malformed JSON body returns 400 INVALID_BODY", async () => {
    const { handler } = require("../../src/handlers/generate");
    const response = await handler({
      headers: { authorization: "Bearer abcd1234" },
      body: "{bad-json",
    });
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("INVALID_BODY");
  });

  test("rate limit exhausted returns 429 RATE_LIMIT_EXCEEDED", async () => {
    const { handler } = require("../../src/handlers/generate");
    mockSend.mockResolvedValueOnce({
      Item: {
        api_key: { S: "rate0001key" },
        customer_id: { S: "cust_4" },
        tier: { S: "free" },
        calls_this_month: { N: "500" },
        monthly_limit: { N: "500" },
      },
    });

    const response = await handler(
      eventWith(
        {
          length: 12,
          quantity: 2,
          options: { uppercase: true, lowercase: true, numbers: false, symbols: false, exclude_ambiguous: false },
          compliance: "strong",
        },
        "Bearer rate0001key"
      )
    );
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(429);
    expect(body.error).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.calls_remaining).toBe(0);
  });

  test("meta.calls_remaining is a number", async () => {
    const { handler } = require("../../src/handlers/generate");

    mockSend
      .mockResolvedValueOnce({
        Item: {
          api_key: { S: "remains11key" },
          customer_id: { S: "cust_5" },
          tier: { S: "pro" },
          calls_this_month: { N: "4" },
          monthly_limit: { N: "10" },
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await handler(
      eventWith(
        {
          length: 14,
          quantity: 1,
          options: { uppercase: true, lowercase: true, numbers: true, symbols: false, exclude_ambiguous: false },
          compliance: "strong",
        },
        "Bearer remains11key"
      )
    );

    const body = JSON.parse(response.body);
    expect(typeof body.meta.calls_remaining).toBe("number");
  });
});
