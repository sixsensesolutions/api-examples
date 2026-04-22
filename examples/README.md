# Six Sense Solutions — Node.js Integration Example

Replace insecure credential generation with one API call. Every credential comes back with entropy documentation, compliance profile, generation timestamp, and an audit trail.

## Quick start

1. Get an API key (10 seconds, no credit card):

curl -X POST https://api.sixsensesolutions.net/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@company.com"}'

2. Run the demo:

node demo.js your-api-key-here

## What the demo shows

- Generate SOC2-compliant credentials with documented entropy
- Validate against compliance policies with scored results
- Breach-check against 850M+ passwords using k-anonymity
- Log credential lifecycle events (access, rotation, revocation)
- Pull the tamper-evident audit log (Pro tier)
- Generate a compliance evidence report

## SDK Methods

- client.generate(params) — Generate compliant credentials
- client.validate(password, compliance) — Score against policy
- client.breachCheck(password) — k-anonymity breach detection
- client.logEvent(params) — Credential lifecycle logging
- client.auditLog(startDate, endDate) — Retrieve audit trail (Pro+)

Full docs: https://www.sixsensesolutions.net/api-reference/
