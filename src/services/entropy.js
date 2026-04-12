function calculateEntropy(charsetSize, length) {
  const safeCharsetSize = Number(charsetSize);
  const safeLength = Number(length);

  if (!Number.isFinite(safeCharsetSize) || !Number.isFinite(safeLength)) {
    return 0;
  }

  if (safeCharsetSize <= 1 || safeLength <= 0) {
    return 0;
  }

  const entropy = Math.log2(safeCharsetSize) * safeLength;

  if (!Number.isFinite(entropy)) {
    return 0;
  }

  // Round up to the nearest 0.5 to provide conservative auditor-facing entropy values.
  return Math.ceil(entropy * 2) / 2;
}

module.exports = calculateEntropy;
