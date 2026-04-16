# Six Sense Solutions API Examples

Security primitives API: NIST-aligned generation, policy validation, and k-anonymity breach checks with built-in audit documentation.

## The problem

Most credential generation in production codebases uses `Math.random()` or weak functions that fail security audits. Even teams that switch to `crypto.randomInt()` still have no documentation proving their credentials meet compliance standards. Validation and breach checks are usually separate tools with inconsistent evidence.

## The solution

One API key covers **POST /v1/generate**, **POST /v1/validate**, and **POST /v1/breach-check** (plus **GET /v1/audit-log** when available). Each call returns machine-readable fields your compliance team can hand to an auditor.

### Generate

```javascript
const { passwords, meta } = await fetch(
  'https://api.sixsensesolutions.net/v1/generate',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      length: 20,
      quantity: 1,
      compliance: 'NIST',
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true
      }
    })
  }
).then(r => r.json());

console.log(meta);
// {
//   length: 20,
//   entropy_bits: 120.4,
//   generated_at: "2026-04-10T14:57:35Z",
//   compliance_profile: "NIST",
//   calls_remaining: 499
// }
```

### Validate

```javascript
const validation = await fetch('https://api.sixsensesolutions.net/v1/validate', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credential: 'MyStr0ng!Pass#2026',
    policy: { compliance: 'NIST' }
  })
}).then(r => r.json());

console.log(validation.passed, validation.score, validation.policy_results);
```

### Breach check

```javascript
const breach = await fetch('https://api.sixsensesolutions.net/v1/breach-check', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ credential: 'password123' })
}).then(r => r.json());

console.log(breach.exposed, breach.exposure_count, breach.risk_rating);
```

## Get a free API key

300 calls per month. No credit card. Instant key generation.

[Get your free API key at sixsensesolutions.net](https://sixsensesolutions.net)

## Examples in this repo

- [Node.js examples](examples/nodejs/)
- [Python examples](examples/python/)
- [curl examples](examples/curl/)
- [Drop-in utility function](utils/secure-credential-generator.js)

## Compliance profiles (generate and validate)

| Profile | Min Length | Requirements | Use Case |
|---------|-----------|--------------|----------|
| NIST | 15 | Uppercase, lowercase, numbers, symbols, no ambiguous chars | Federal and regulated environments |
| SOC2 | 12 | Uppercase, lowercase, numbers, no ambiguous chars | SOC2 audit programs |
| strong | 8 | Caller defined | General use |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/generate | Cryptographically secure credentials with entropy and compliance metadata |
| POST | /v1/validate | Strength and entropy scoring against NIST, SOC2, or custom policy |
| POST | /v1/breach-check | k-anonymity check against HaveIBeenPwned (~850M breached passwords) |
| GET | /v1/audit-log | Tamper-evident event log (coming soon) |

## API reference

Full documentation at [sixsensesolutions.net/api-reference](https://sixsensesolutions.net/api-reference/)

## License

MIT
