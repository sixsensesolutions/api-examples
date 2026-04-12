const crypto = require("crypto");
function loadSettings() {
  try {
    return require("../../settings/local.json");
  } catch (error) {
    return require("../settings/local.json");
  }
}

const settings = loadSettings();

const BASE_CHARSETS = {
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lowercase: "abcdefghjkmnpqrstuvwxyz",
  numbers: "23456789",
  symbols: "!@#$%^&*",
};

const AMBIGUOUS_CHARS = /[O0Il1|]/g;

function removeAmbiguous(charset) {
  return charset.replace(AMBIGUOUS_CHARS, "");
}

function buildEffectiveOptions(options, complianceProfile) {
  if (!complianceProfile || complianceProfile === "strong") {
    return {
      uppercase: Boolean(options.uppercase),
      lowercase: Boolean(options.lowercase),
      numbers: Boolean(options.numbers),
      symbols: Boolean(options.symbols),
      exclude_ambiguous: Boolean(options.exclude_ambiguous),
      min_length: settings.compliance_profiles.strong.min_length,
    };
  }

  const profile = settings.compliance_profiles[complianceProfile];
  if (!profile) {
    throw new Error(`Unknown compliance profile: ${complianceProfile}`);
  }

  return {
    uppercase: profile.require_uppercase,
    lowercase: profile.require_lowercase,
    numbers: profile.require_numbers,
    symbols: profile.require_symbols,
    exclude_ambiguous: profile.exclude_ambiguous,
    min_length: profile.min_length,
  };
}

function pickRandomChar(charset) {
  const index = crypto.randomInt(0, charset.length);
  return charset[index];
}

function buildPools(effectiveOptions) {
  const enabledGroups = [];

  if (effectiveOptions.uppercase) {
    enabledGroups.push(BASE_CHARSETS.uppercase);
  }
  if (effectiveOptions.lowercase) {
    enabledGroups.push(BASE_CHARSETS.lowercase);
  }
  if (effectiveOptions.numbers) {
    enabledGroups.push(BASE_CHARSETS.numbers);
  }
  if (effectiveOptions.symbols) {
    enabledGroups.push(BASE_CHARSETS.symbols);
  }

  if (enabledGroups.length === 0) {
    throw new Error("At least one character set must be enabled");
  }

  const normalizedGroups = effectiveOptions.exclude_ambiguous
    ? enabledGroups.map(removeAmbiguous)
    : enabledGroups.slice();

  if (normalizedGroups.some((group) => group.length === 0)) {
    throw new Error("A required character set became empty after exclusions");
  }

  return normalizedGroups;
}

function shuffle(chars) {
  const arr = chars.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function generateOnePassword(length, pools, combinedCharset) {
  const chars = [];

  for (const group of pools) {
    chars.push(pickRandomChar(group));
  }

  while (chars.length < length) {
    chars.push(pickRandomChar(combinedCharset));
  }

  return shuffle(chars).join("");
}

function generatePasswords(input) {
  const effectiveOptions = buildEffectiveOptions(input.options, input.compliance);
  const actualLength = Math.max(Number(input.length), effectiveOptions.min_length);
  const quantity = Number(input.quantity);
  const pools = buildPools(effectiveOptions);
  const combinedCharset = pools.join("");

  if (!Number.isInteger(actualLength) || actualLength <= 0) {
    throw new Error("length must be a positive integer");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive integer");
  }
  if (actualLength < pools.length) {
    throw new Error("length must allow all required character classes");
  }

  const maxUnique = combinedCharset.length ** actualLength;
  if (quantity > maxUnique) {
    throw new Error("Requested quantity exceeds unique password space");
  }

  const passwords = [];
  const seen = new Set();

  while (passwords.length < quantity) {
    const password = generateOnePassword(actualLength, pools, combinedCharset);
    if (!seen.has(password)) {
      seen.add(password);
      passwords.push(password);
    }
  }

  return {
    passwords,
    charset_size: combinedCharset.length,
    actual_length: actualLength,
  };
}

module.exports = generatePasswords;
