# Six Sense Solutions — Security Primitives API

Generate cryptographically secure credentials with built-in compliance documentation. One API call replaces insecure credential generation and produces machine-readable audit evidence automatically.

## The Problem

Most codebases generate credentials like this:

```javascript
const password = crypto.randomBytes(16).toString('hex');
```

Cryptographically secure — but when the SOC2 auditor asks for proof of what compliance standard was applied, what the entropy was, when it was generated, and when it was rotated, engineering has nothing. Manual reconstruction is expensive, slow, and often incomplete.

## The Solution

```javascript
const SixSense = require('./six-sense-credentials');
const client = new SixSense(process.env.SIXSENSE_API_KEY);
const result = await client.generate({ length: 20, compliance: 'SOC2' });
```

Same one line of code. The response includes the credential plus entropy bits, compliance profile, generation timestamp, and calls remaining. That metadata is the audit evidence, created at the same moment as the credential.

## Tech Stack

- **Runtime:** Node.js on AWS Lambda
- **API Gateway:** AWS API Gateway HTTP API v2
- **Database:** Amazon DynamoDB (KMS encrypted, point-in-time recovery)
- **CDN:** Amazon CloudFront
- **Infrastructure-as-Code:** Terraform with S3 state backend
- **Payments:** Stripe (live mode, webhook integration)
- **Monitoring:** New Relic (browser + API monitoring)
- **Credential Generation:** Node.js `crypto.randomInt()` (CSPRNG)
- **Breach Detection:** Have I Been Pwned API via k-anonymity (partial SHA-1 hash only, plaintext never transmitted)
- **Architecture:** Zero-knowledge — credentials are never stored, logged, or retained by the API

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/signup | Get a free API key (300 calls/month, no credit card) |
| POST | /v1/generate | Generate compliant credentials with audit evidence |
| POST | /v1/validate | Score a credential against NIST/SOC2/Strong policy |
| POST | /v1/breach-check | Check against 850M+ breached passwords (k-anonymity) |
| POST | /v1/credential/event | Log lifecycle events (accessed, rotated, revoked, expired, shared) |
| GET | /v1/audit-log | Retrieve tamper-evident audit trail (Pro tier) |

## Quick Start

### 1. Get a free API key

```bash
curl -X POST https://api.sixsensesolutions.net/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@company.com"}'
```

### 2. Generate a credential

```bash
curl -X POST https://api.sixsensesolutions.net/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"length":20,"quantity":1,"compliance":"SOC2"}'
```

### 3. Run the full demo

```bash
cd examples
node demo.js YOUR_API_KEY
```

The demo walks through a complete scenario: generate a SOC2-compliant credential, validate it, breach-check it, log lifecycle events (access, rotation, revocation), pull the audit log, and generate a compliance evidence report.

## Node.js SDK

Drop `examples/six-sense-credentials.js` into your project. Zero dependencies.

```javascript
const SixSense = require('./six-sense-credentials');
const client = new SixSense('sss_free_your_key');

// Generate
const cred = await client.generate({ length: 20, compliance: 'SOC2' });

// Validate
const val = await client.validate(cred.passwords[0], 'SOC2');

// Breach check
const breach = await client.breachCheck(cred.passwords[0]);

// Lifecycle logging
await client.logEvent({
  credential_id: 'user-jane-doe',
  event_type: 'rotated',
  actor: 'admin@company.com',
  environment: 'production',
  metadata: { reason: '90-day rotation policy' }
});

// Audit log (Pro tier)
const log = await client.auditLog('2026-04-01', '2026-04-21');
```

## Compliance Profiles

| Profile | Min Length | Requirements | Use Case |
|---------|-----------|--------------|----------|
| NIST | 15 | Upper + lower + numbers + symbols, ambiguous excluded | Federal, government, NIST 800-63B |
| SOC2 | 12 | Upper + lower + numbers, ambiguous excluded | SOC2 audits, enterprise |
| Strong | 8 | Caller options respected | General secure generation |

## Integration Examples

### Express middleware — user creation

```javascript
app.post('/api/users', async (req, res) => {
  const cred = await client.generate({ compliance: 'SOC2' });
  const breach = await client.breachCheck(cred.passwords[0]);

  const user = await db.users.create({
    email: req.body.email,
    password: hash(cred.passwords[0]),
    credential_entropy: cred.meta.entropy_bits,
    credential_compliance: cred.meta.compliance_profile,
  });

  await client.logEvent({
    credential_id: `user-${user.id}`,
    event_type: 'accessed',
    actor: req.auth.admin_id,
    environment: process.env.NODE_ENV,
  });

  res.json({ user_id: user.id, temp_password: cred.passwords[0] });
});
```

### Scheduled credential rotation

```javascript
async function rotateServiceCredentials() {
  const services = await db.services.findDueForRotation();

  for (const svc of services) {
    const cred = await client.generate({ length: 32, compliance: 'NIST' });
    const breach = await client.breachCheck(cred.passwords[0]);
    if (breach.exposure_count > 0) continue;

    await svc.updateCredential(cred.passwords[0]);
    await client.logEvent({
      credential_id: svc.credential_id,
      event_type: 'rotated',
      actor: 'rotation-service',
      environment: 'production',
      metadata: { reason: 'scheduled-rotation', service: svc.name },
    });
  }
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| MISSING_AUTH | 401 | No Authorization header |
| INVALID_KEY | 401 | API key not found |
| RATE_LIMIT_EXCEEDED | 429 | Monthly call limit reached |
| INVALID_LENGTH | 400 | Length outside 8-128 range |
| INVALID_QUANTITY | 400 | Quantity outside 1-50 range |
| INVALID_COMPLIANCE | 400 | Unknown compliance profile |
| INVALID_CREDENTIAL | 400 | Credential field missing or empty |
| INVALID_EVENT_TYPE | 400 | Event type not one of: accessed, rotated, revoked, expired, shared |
| INVALID_ACTOR | 400 | Actor field missing or empty |
| AUDIT_LOG_NOT_AVAILABLE | 403 | Free tier — upgrade to Pro for audit log |

## Pricing

| Tier | Price | Calls/Month | Audit Log | Lifecycle Events |
|------|-------|-------------|-----------|-----------------|
| Free | $0 | 300 | No | Yes |
| Pro | $29/mo | 10,000 | Yes | Yes |
| Business | $149/mo | 100,000 | Yes | Yes + Priority Support |

## Security

- Credentials generated using `crypto.randomInt()` (CSPRNG) — never `Math.random()`
- Zero-knowledge architecture — API never stores, logs, or retains generated credentials
- Breach detection via k-anonymity — only a partial SHA-1 hash is transmitted, plaintext never leaves caller's environment
- DynamoDB encrypted at rest with AWS KMS
- Point-in-time recovery enabled on all tables
- All traffic over TLS
- Infrastructure managed via Terraform (auditable, reproducible)

## Links

- **Website:** [sixsensesolutions.net](https://www.sixsensesolutions.net)
- **API Reference:** [sixsensesolutions.net/api-reference](https://www.sixsensesolutions.net/api-reference/)
- **Live Demo App:** [sixsensesolutions.net/app](https://www.sixsensesolutions.net/app/)

## License

MIT
