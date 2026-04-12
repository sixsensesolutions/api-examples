const mockAuth = jest.fn();

jest.mock("../../src/services/auth", () => ({
  authenticateRequest: (...args) => mockAuth(...args),
}));

describe("breach-check handler", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    mockAuth.mockReset();
    process.env.DYNAMODB_TABLE = "spg-api-keys";
    mockAuth.mockResolvedValue({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 100 },
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function event(body, auth = "Bearer test_key") {
    return {
      headers: { authorization: auth },
      body: typeof body === "string" ? body : JSON.stringify(body),
    };
  }

  test("known breached password returns exposed true with count greater than 0", async () => {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha1").update("password123").digest("hex").toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:47382\r\n`,
    });

    const { handler } = require("../../src/handlers/breach-check");
    const res = await handler(event({ credential: "password123" }));
    expect(res.statusCode).toBe(200);
    const b = JSON.parse(res.body);
    expect(b.exposed).toBe(true);
    expect(b.exposure_count).toBe(47382);
    expect(b.risk_rating).toBe("critical");
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      expect.any(Object)
    );
  });

  test("unbreached random credential returns exposed false", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => "00000:1\r\n",
    });

    const { handler } = require("../../src/handlers/breach-check");
    const res = await handler(event({ credential: "zzzzzz-not-in-this-range-unique-xyz" }));
    expect(res.statusCode).toBe(200);
    const b = JSON.parse(res.body);
    expect(b.exposed).toBe(false);
    expect(b.exposure_count).toBe(0);
    expect(b.risk_rating).toBe("low");
  });

  test("SHA-1 hash computed correctly", async () => {
    const crypto = require("crypto");
    const expected = crypto.createHash("sha1").update("test").digest("hex").toUpperCase();
    global.fetch.mockImplementation(async (url) => {
      const prefix = url.split("/").pop();
      expect(expected.startsWith(prefix)).toBe(true);
      return { ok: true, text: async () => "" };
    });
    const { handler } = require("../../src/handlers/breach-check");
    await handler(event({ credential: "test" }));
  });

  test("only first 5 chars of hash sent to HIBP", async () => {
    global.fetch.mockResolvedValue({ ok: true, text: async () => "" });
    const { handler } = require("../../src/handlers/breach-check");
    await handler(event({ credential: "abcdef" }));
    const url = global.fetch.mock.calls[0][0];
    expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/);
  });

  test("full hash never logged", async () => {
    const crypto = require("crypto");
    const full = crypto.createHash("sha1").update("password123").digest("hex").toUpperCase();
    global.fetch.mockResolvedValue({ ok: true, text: async () => "" });
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { handler } = require("../../src/handlers/breach-check");
    await handler(event({ credential: "password123" }));
    const logs = logSpy.mock.calls.flat().join(" ");
    expect(logs.includes(full)).toBe(false);
    logSpy.mockRestore();
  });

  test("credential value never logged", async () => {
    const secret = "my-unique-secret-password-xyz";
    global.fetch.mockResolvedValue({ ok: true, text: async () => "" });
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { handler } = require("../../src/handlers/breach-check");
    await handler(event({ credential: secret }));
    const logs = logSpy.mock.calls.flat().join(" ");
    expect(logs.includes(secret)).toBe(false);
    logSpy.mockRestore();
  });

  test("missing credential returns 400", async () => {
    const { handler } = require("../../src/handlers/breach-check");
    const res = await handler(event({}));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_CREDENTIAL");
  });

  test("risk rating matches exposure count thresholds", async () => {
    const crypto = require("crypto");
    const cases = [
      { count: 0, risk: "low" },
      { count: 5, risk: "medium" },
      { count: 10, risk: "medium" },
      { count: 11, risk: "high" },
      { count: 100, risk: "high" },
      { count: 101, risk: "critical" },
    ];

    for (const { count, risk } of cases) {
      jest.resetModules();
      mockAuth.mockResolvedValue({
        ok: true,
        value: { customer_id: "c1", tier: "pro", calls_remaining: 100 },
      });
      global.fetch = jest.fn();
      const cred = `pw-${count}-${risk}-uniq`;
      const hash = crypto.createHash("sha1").update(cred).digest("hex").toUpperCase();
      const suffix = hash.slice(5);
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => (count === 0 ? "" : `${suffix}:${count}\r\n`),
      });
      const { handler } = require("../../src/handlers/breach-check");
      const res = await handler(event({ credential: cred }));
      const b = JSON.parse(res.body);
      expect(b.risk_rating).toBe(risk);
    }
  });

  test("HIBP API failure returns 503 with error SERVICE_UNAVAILABLE", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 502 });
    const { handler } = require("../../src/handlers/breach-check");
    const res = await handler(event({ credential: "anything" }));
    expect(res.statusCode).toBe(503);
    const b = JSON.parse(res.body);
    expect(b.error).toBe("SERVICE_UNAVAILABLE");
  });
});
