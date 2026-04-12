const mockSend = jest.fn();
const mockDdbClientCtor = jest.fn(() => ({ send: mockSend }));

jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: function DynamoDBClient(...args) {
      mockDdbClientCtor(...args);
      return { send: mockSend };
    },
    QueryCommand: function QueryCommand(input) {
      this.input = input;
    },
    PutItemCommand: function PutItemCommand(input) {
      this.input = input;
    },
  };
});

describe("signup handler", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockDdbClientCtor.mockClear();
    process.env.DYNAMODB_TABLE = "spg-api-keys";
  });

  test("valid signup returns 200 with api_key prefix", async () => {
    const crypto = require("crypto");
    jest.spyOn(crypto, "randomBytes").mockReturnValue(Buffer.from("a".repeat(32), "hex"));

    const { handler } = require("../../src/handlers/signup");
    mockSend
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({});

    const response = await handler({
      body: JSON.stringify({ name: "Test User", email: "test@example.com" }),
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.api_key.startsWith("sss_free_")).toBe(true);
    expect(body.tier).toBe("free");
    expect(body.monthly_limit).toBe(500);
  });

  test("missing name returns 400 INVALID_NAME", async () => {
    const { handler } = require("../../src/handlers/signup");
    const response = await handler({
      body: JSON.stringify({ email: "test@example.com" }),
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_NAME");
  });

  test("missing email returns 400 INVALID_EMAIL", async () => {
    const { handler } = require("../../src/handlers/signup");
    const response = await handler({
      body: JSON.stringify({ name: "Test User" }),
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_EMAIL");
  });

  test("invalid email format returns 400 INVALID_EMAIL", async () => {
    const { handler } = require("../../src/handlers/signup");
    const response = await handler({
      body: JSON.stringify({ name: "Test User", email: "invalid-email" }),
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_EMAIL");
  });

  test("duplicate email returns 409 ALREADY_REGISTERED", async () => {
    const { handler } = require("../../src/handlers/signup");
    mockSend.mockResolvedValueOnce({
      Items: [{ customer_id: { S: "test@example.com" } }],
    });

    const response = await handler({
      body: JSON.stringify({ name: "Test User", email: "test@example.com" }),
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).error).toBe("ALREADY_REGISTERED");
  });

  test("generated key uses crypto.randomBytes", async () => {
    const crypto = require("crypto");
    const randomBytesSpy = jest
      .spyOn(crypto, "randomBytes")
      .mockReturnValue(Buffer.from("b".repeat(32), "hex"));

    const { handler } = require("../../src/handlers/signup");
    mockSend
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({});

    await handler({
      body: JSON.stringify({ name: "Test User", email: "test@example.com" }),
    });

    expect(randomBytesSpy).toHaveBeenCalledWith(16);
  });

  test("api_key never appears in log output", async () => {
    const crypto = require("crypto");
    jest.spyOn(crypto, "randomBytes").mockReturnValue(Buffer.from("c".repeat(32), "hex"));
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    const { handler } = require("../../src/handlers/signup");
    mockSend
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({});

    const response = await handler({
      body: JSON.stringify({ name: "Test User", email: "test@example.com" }),
    });
    const apiKey = JSON.parse(response.body).api_key;
    const logs = logSpy.mock.calls.flat().join(" ");

    expect(logs.includes(apiKey)).toBe(false);
    logSpy.mockRestore();
  });
});
