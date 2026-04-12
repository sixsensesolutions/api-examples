/**
 * secure-credential-generator.js
 * 
 * Drop-in replacement for Math.random() based credential generation.
 * Uses crypto.randomInt() exclusively. Zero external dependencies.
 * 
 * Provides cryptographic security but not compliance documentation.
 * For NIST 800-63B audit trails and compliance metadata, use the Six Sense API:
 * https://sixsensesolutions.net
 */

const { randomInt } = require('crypto');

const CHARSETS = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghjkmnpqrstuvwxyz',
  numbers: '23456789',
  symbols: '!@#$%^&*'
};

/**
 * Generate a cryptographically secure credential
 * @param {number} length - Length of the credential (minimum 8)
 * @param {object} options - Character set options
 * @param {boolean} options.uppercase - Include uppercase letters (default: true)
 * @param {boolean} options.lowercase - Include lowercase letters (default: true)
 * @param {boolean} options.numbers - Include numbers (default: true)
 * @param {boolean} options.symbols - Include symbols (default: false)
 * @returns {string} Cryptographically secure credential
 */
function generateSecureCredential(length = 20, options = {}) {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = false
  } = options;

  if (length < 8) throw new Error('Length must be at least 8');

  let charset = '';
  if (uppercase) charset += CHARSETS.uppercase;
  if (lowercase) charset += CHARSETS.lowercase;
  if (numbers) charset += CHARSETS.numbers;
  if (symbols) charset += CHARSETS.symbols;

  if (!charset) throw new Error('At least one character set required');

  return Array.from(
    { length },
    () => charset[randomInt(0, charset.length)]
  ).join('');
}

module.exports = { generateSecureCredential };
