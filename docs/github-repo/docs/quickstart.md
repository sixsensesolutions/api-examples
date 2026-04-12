# Quickstart Guide

## Step 1: Get your free API key

Sign up at [sixsensesolutions.net](https://sixsensesolutions.net) or use the API directly:

```bash
curl -s -X POST https://api.sixsensesolutions.net/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"your@email.com"}'
```

Save the `api_key` from the response. It is shown once.

## Step 2: Generate your first credential

```bash
export SIX_SENSE_API_KEY=your_api_key_here

curl -s -X POST https://api.sixsensesolutions.net/v1/generate \
  -H "Authorization: Bearer ${SIX_SENSE_API_KEY}" \
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
  }'
```

## Step 3: Read the compliance documentation in the response

Every response includes `meta.entropy_bits`, `meta.compliance_profile`, 
and `meta.generated_at`. That metadata is your audit evidence.

## Full API reference

[sixsensesolutions.net/api-reference](https://sixsensesolutions.net/api-reference/)
