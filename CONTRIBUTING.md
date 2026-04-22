# Six Sense API - Project Instructions

This repository builds a shift-left developer security API for Six Sense Solutions LLC.

## Security Rules (Source of Truth)

- This is a security product. Prioritize secure defaults and deterministic behavior.
- `Math.random()` is forbidden everywhere.
- Use `crypto.randomInt()` only for randomness.
- Do not hardcode credentials or secrets.
- Keep code free of side effects unless explicitly required.
- Never log generated passwords or assign generated passwords to logged variables.
- Use zero external dependencies unless explicitly approved.
- Compliance profile enforcement overrides caller options silently.
- Follow profile minimum lengths and required character classes exactly.

## Compliance Profiles

- **NIST**: minimum length 15, require uppercase/lowercase/numbers/symbols, exclude ambiguous characters.
- **SOC2**: minimum length 12, require uppercase/lowercase/numbers, symbols optional false, exclude ambiguous characters.
- **strong**: minimum length 8, caller options respected.

## Implementation Notes

- Read `settings/local.json` for compliance profile definitions.
- Ensure generated passwords match requested final length exactly after profile enforcement.
- Return `actual_length` used after profile enforcement.
- Keep interfaces stable and test-driven.
