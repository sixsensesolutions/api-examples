const mockAuth = jest.fn();
const mockWriteAudit = jest.fn().mockResolvedValue(undefined);

jest.mock("../../src/services/audit-store", () => ({
  writeAuditEvent: (...args) => mockWriteAudit(...args),
}));

jest.mock("../../src/services/auth", () => ({
  authenticateRequest: (...args) => mockAuth(...args),
}));

describe("validate handler", () => {
  beforeEach(() => {
    jest.resetModules();
    mockAuth.mockReset();
    mockWriteAudit.mockReset();
    mockWriteAudit.mockResolvedValue(undefined);
    process.env.DYNAMODB_TABLE = "spg-api-keys";
    mockAuth.mockResolvedValue({
      ok: true,
      value: { customer_id: "c1", tier: "pro", calls_remaining: 100 },
    });
  });

  function event(body, auth = "Bearer test_key") {
    return {
      headers: { authorization: auth },
      body: typeof body === "string" ? body : JSON.stringify(body),
    };
  }

  test("valid NIST-compliant credential returns passed true", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "Aa1!Aa1!Aa1!Aa1!",
        policy: { compliance: "NIST" },
      })
    );
    expect(res.statusCode).toBe(200);
    const b = JSON.parse(res.body);
    expect(b.passed).toBe(true);
    expect(b.compliance_profile).toBe("NIST");
    expect(b.failures).toEqual([]);
    expect(b.policy_results.length.passed).toBe(true);
    expect(b.policy_results.entropy_bits.passed).toBe(true);
  });

  test("short credential returns passed false with length failure in failures array", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "Aa1!Aa1!",
        policy: { compliance: "NIST" },
      })
    );
    expect(res.statusCode).toBe(200);
    const b = JSON.parse(res.body);
    expect(b.passed).toBe(false);
    expect(b.failures.some((f) => f.includes("Length") && f.includes("below"))).toBe(true);
    expect(b.policy_results.length.passed).toBe(false);
  });

  test("missing uppercase when required returns passed false", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "a1!a1!a1!a1!a1!a1!",
        policy: { compliance: "NIST" },
      })
    );
    const b = JSON.parse(res.body);
    expect(b.passed).toBe(false);
    expect(b.failures.some((f) => f.toLowerCase().includes("uppercase"))).toBe(true);
    expect(b.policy_results.uppercase.passed).toBe(false);
  });

  test("low entropy returns passed false with entropy failure", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "Aa1!Aa1!Aa1!Aa1!",
        policy: {
          min_length: 15,
          min_entropy_bits: 200,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: true,
        },
      })
    );
    const b = JSON.parse(res.body);
    expect(b.passed).toBe(false);
    expect(b.failures.some((f) => f.includes("Entropy"))).toBe(true);
    expect(b.policy_results.entropy_bits.passed).toBe(false);
    expect(b.policy_results.length.passed).toBe(true);
  });

  test("NIST profile overrides caller policy", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "Aa1!Aa1!Aa1!Aa1!",
        policy: {
          compliance: "NIST",
          min_length: 8,
          min_entropy_bits: 40,
          require_uppercase: false,
        },
      })
    );
    const b = JSON.parse(res.body);
    expect(b.compliance_profile).toBe("NIST");
    expect(b.policy_results.length.required).toBe(15);
    expect(b.policy_results.entropy_bits.required).toBe(80);
    expect(b.policy_results.uppercase.required).toBe(true);
  });

  test("credential value never appears in any log output", async () => {
    const secret = "UNIQUE_SECRET_XYZ_12345";
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { handler } = require("../../src/handlers/validate");
    await handler(
      event({
        credential: secret,
        policy: { compliance: "strong", min_length: 8, min_entropy_bits: 40 },
      })
    );
    const logs = logSpy.mock.calls.flat().join(" ");
    expect(logs.includes(secret)).toBe(false);
    logSpy.mockRestore();
  });

  test("missing credential returns 400 INVALID_CREDENTIAL", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(event({ policy: { compliance: "NIST" } }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_CREDENTIAL");
  });

  test("score of 100 for perfect credential", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "Aa1!Aa1!Aa1!Aa1!",
        policy: { compliance: "NIST" },
      })
    );
    expect(JSON.parse(res.body).score).toBe(100);
  });

  test("score of 0 for credential failing all requirements", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler(
      event({
        credential: "a",
        policy: { compliance: "NIST" },
      })
    );
    const b = JSON.parse(res.body);
    expect(b.passed).toBe(false);
    expect(b.score).toBe(0);
  });

  test("invalid body returns 400 INVALID_BODY", async () => {
    const { handler } = require("../../src/handlers/validate");
    const res = await handler({ headers: { authorization: "Bearer k" }, body: "not-json{" });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("INVALID_BODY");
  });

  test("missing auth uses auth flow", async () => {
    const { handler } = require("../../src/handlers/validate");
    mockAuth.mockResolvedValueOnce({
      ok: false,
      error: { error: "MISSING_AUTH", status: 401 },
    });
    const res = await handler({
      headers: {},
      body: JSON.stringify({ credential: "Aa1!Aa1!Aa1!Aa1!", policy: { compliance: "NIST" } }),
    });
    expect(res.statusCode).toBe(401);
  });

  test("writeAuditEvent records metadata without credential value", async () => {
    const { handler } = require("../../src/handlers/validate");
    const secret = "Aa1!Aa1!Aa1!Aa1!UniqueAuditToken987";
    await handler(
      event({
        credential: secret,
        policy: { compliance: "NIST" },
      })
    );
    expect(mockWriteAudit).toHaveBeenCalled();
    const payload = mockWriteAudit.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain("UniqueAuditToken987");
    expect(payload.event_type).toBe("validate");
    expect(payload.request.credential_length).toBe(secret.length);
  });
});
