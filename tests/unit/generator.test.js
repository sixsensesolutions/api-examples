const path = require("path");

describe("password generation engine", () => {
  test("module exists and exports a function", () => {
    const generatorPath = path.join(__dirname, "../../src/services/generator");
    const generatePasswords = require(generatorPath);
    expect(typeof generatePasswords).toBe("function");
  });

  test("every generated password matches requested length", () => {
    const generatePasswords = require("../../src/services/generator");
    const result = generatePasswords({
      length: 20,
      quantity: 50,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: false,
      },
      compliance: "strong",
    });

    expect(result.actual_length).toBe(20);
    expect(result.passwords).toHaveLength(50);
    for (const password of result.passwords) {
      expect(password).toHaveLength(20);
    }
  });

  test("exclude_ambiguous removes all ambiguous characters", () => {
    const generatePasswords = require("../../src/services/generator");
    const result = generatePasswords({
      length: 24,
      quantity: 200,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true,
      },
      compliance: "strong",
    });

    expect(result.passwords.every((p) => !/[O0Il1|]/.test(p))).toBe(true);
  });

  test("NIST silently enforces minimum length 15", () => {
    const generatePasswords = require("../../src/services/generator");
    const result = generatePasswords({
      length: 12,
      quantity: 10,
      options: {
        uppercase: false,
        lowercase: true,
        numbers: false,
        symbols: false,
        exclude_ambiguous: false,
      },
      compliance: "NIST",
    });

    expect(result.actual_length).toBe(15);
    expect(result.passwords.every((p) => p.length === 15)).toBe(true);
    expect(result.passwords.every((p) => /[A-Z]/.test(p))).toBe(true);
    expect(result.passwords.every((p) => /[a-z]/.test(p))).toBe(true);
    expect(result.passwords.every((p) => /[2-9]/.test(p))).toBe(true);
    expect(result.passwords.every((p) => /[!@#$%^&*]/.test(p))).toBe(true);
    expect(result.passwords.every((p) => !/[O0Il1|]/.test(p))).toBe(true);
  });

  test("10,000 generated passwords are unique", () => {
    const generatePasswords = require("../../src/services/generator");
    const result = generatePasswords({
      length: 24,
      quantity: 10000,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true,
      },
      compliance: "strong",
    });

    expect(new Set(result.passwords).size).toBe(10000);
  });
});
