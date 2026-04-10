# Six Sense Solutions API Examples

NIST 800-63B compliant credential generation with built-in audit documentation.

## The problem

Most credential generation in production codebases uses `Math.random()` or weak functions that fail security audits. Even teams that switch to `crypto.randomInt()` still have no documentation proving their credentials meet compliance standards.

## The solution

One API call generates cryptographically secure credentials and returns compliance documentation automatically.

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
//   entropy_bits: 120.4,  // audit evidence, 120+ bits exceeds NIST minimum
//   generated_at: "2026-04-10T14:57:35Z",
//   compliance_profile: "NIST",
//   calls_remaining: 499
// }
```

## Get a free API key

500 calls per month. No credit card. Instant key generation.

[Get your free API key at sixsensesolutions.net](https://sixsensesolutions.net)

## Examples in this repo

- [Node.js examples](examples/nodejs/)
- [Python examples](examples/python/)
- [curl examples](examples/curl/)
- [Drop-in utility function](utils/secure-credential-generator.js)

## Compliance profiles

| Profile | Min Length | Requirements | Use Case |
|---------|-----------|--------------|----------|
| NIST | 15 | Uppercase, lowercase, numbers, symbols, no ambiguous chars | Federal and regulated environments |
| SOC2 | 12 | Uppercase, lowercase, numbers, no ambiguous chars | SOC2 audit programs |
| strong | 8 | Caller defined | General use |

## API reference

Full documentation at [sixsensesolutions.net/api-reference](https://sixsensesolutions.net/api-reference/)

## License

MIT
