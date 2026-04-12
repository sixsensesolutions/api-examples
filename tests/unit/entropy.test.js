describe("entropy calculation", () => {
  test("20 char full charset (95) returns 131.5", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(calculateEntropy(95, 20)).toBe(131.5);
  });

  test("15 char alphanumeric (62) returns 89.5", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(calculateEntropy(62, 15)).toBe(89.5);
  });

  test("returns 0 if charset_size is 0", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(calculateEntropy(0, 20)).toBe(0);
  });

  test("returns 0 if length is 0", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(calculateEntropy(95, 0)).toBe(0);
  });

  test("never returns NaN or Infinity", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(Number.isFinite(calculateEntropy(95, 20))).toBe(true);
    expect(Number.isFinite(calculateEntropy(0, 20))).toBe(true);
    expect(Number.isFinite(calculateEntropy(95, 0))).toBe(true);
  });

  test("charset_size 1 returns 0", () => {
    const calculateEntropy = require("../../src/services/entropy");
    expect(calculateEntropy(1, 20)).toBe(0);
  });
});
