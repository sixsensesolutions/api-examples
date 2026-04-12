#!/bin/bash
# Generate a NIST-compliant credential using the Six Sense API
# Get your free API key at sixsensesolutions.net

API_KEY="${SIX_SENSE_API_KEY}"

curl -s -X POST https://api.sixsensesolutions.net/v1/generate \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "length": 20,
    "quantity": 1,
    "compliance": "NIST",
    "options": {
      "uppercase": true,
      "lowercase": true,
      "numbers": true,
      "symbols": true,
      "exclude_ambiguous": true
    }
  }' | python3 -m json.tool
