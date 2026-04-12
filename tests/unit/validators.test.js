describe("request validators", () => {
  test("length 7 returns INVALID_LENGTH with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 7,
        quantity: 1,
        options: {
          uppercase: true,
          lowercase: false,
          numbers: false,
          symbols: false,
          exclude_ambiguous: false,
        },
        compliance: "strong",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_LENGTH);
    expect(result.error.status).toBe(400);
  });

  test("length 129 returns INVALID_LENGTH with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 129,
        quantity: 1,
        options: {
          uppercase: true,
          lowercase: true,
          numbers: false,
          symbols: false,
          exclude_ambiguous: false,
        },
        compliance: "strong",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_LENGTH);
    expect(result.error.status).toBe(400);
  });

  test("quantity 0 returns INVALID_QUANTITY with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 12,
        quantity: 0,
        options: {
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: false,
          exclude_ambiguous: false,
        },
        compliance: "strong",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_QUANTITY);
    expect(result.error.status).toBe(400);
  });

  test("quantity 1001 returns INVALID_QUANTITY with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 12,
        quantity: 1001,
        options: {
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: false,
          exclude_ambiguous: false,
        },
        compliance: "strong",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_QUANTITY);
    expect(result.error.status).toBe(400);
  });

  test("all options false returns NO_CHARSET with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 12,
        quantity: 2,
        options: {
          uppercase: false,
          lowercase: false,
          numbers: false,
          symbols: false,
          exclude_ambiguous: true,
        },
        compliance: "strong",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.NO_CHARSET);
    expect(result.error.status).toBe(400);
  });

  test("unknown compliance returns INVALID_COMPLIANCE with valid_options", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({
      body: {
        length: 12,
        quantity: 2,
        options: {
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: true,
          exclude_ambiguous: true,
        },
        compliance: "PCI",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_COMPLIANCE);
    expect(result.error.status).toBe(400);
    expect(result.error.valid_options).toEqual(
      expect.arrayContaining(["NIST", "SOC2", "strong"])
    );
  });

  test("missing body returns INVALID_BODY with status 400", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const { ERROR_CODES } = require("../../src/utils/errors");
    const result = validateGenerateRequest({});
    expect(result.ok).toBe(false);
    expect(result.error.error).toBe(ERROR_CODES.INVALID_BODY);
    expect(result.error.status).toBe(400);
  });

  test("valid input passes through without error", () => {
    const { validateGenerateRequest } = require("../../src/utils/validators");
    const result = validateGenerateRequest({
      body: {
        length: 12,
        quantity: 5,
        options: {
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: false,
          exclude_ambiguous: false,
        },
        compliance: "strong",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      length: 12,
      quantity: 5,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: false,
        exclude_ambiguous: false,
      },
      compliance: "strong",
    });
  });
});
