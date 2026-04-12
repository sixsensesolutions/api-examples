function createLogRecord(input) {
  const record = {
    timestamp: new Date().toISOString(),
    api_key_id: typeof input.api_key === "string" ? input.api_key.slice(0, 8) : "",
    length_requested: input.length_requested,
    quantity_requested: input.quantity_requested,
    compliance_profile: input.compliance_profile,
    response_time_ms: input.response_time_ms,
    success: Boolean(input.success),
  };

  if (!record.success && typeof input.error_code === "string") {
    record.error_code = input.error_code;
  }

  return record;
}

function logRequest(input, writer = console.log) {
  const record = createLogRecord(input);
  writer(JSON.stringify(record));
  return record;
}

module.exports = {
  createLogRecord,
  logRequest,
};
