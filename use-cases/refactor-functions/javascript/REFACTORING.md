# Exercise 10 — Refactoring: Function Decomposition (JavaScript)

Deliverable for the **Function Decomposition Challenge**. The original
`user_validator.js` was a single ~150-line `validateUserData` function handling every
validation type. It was refactored into small, single-purpose helpers while keeping the
public API and behaviour identical.

## What changed

- The monolithic `validateUserData` is now an **orchestrator** that calls focused helpers
  and collects errors into one array.
- Each concern became its own function:

| Helper | Responsibility |
|--------|---------------|
| `validateRequiredRegistrationFields` | Required fields for registration |
| `validateUsername` | Username length/chasing + uniqueness |
| `validatePassword` | Strength rules + confirmation match |
| `validateRequiredProfileFields` | Empty-but-provided profile fields |
| `validateEmail` | Format + uniqueness, registration-aware |
| `validateDateOfBirth` | Parsability, future, age 13–120 |
| `validateAddress` | Required fields + country-specific postal codes |
| `validatePhone` | Basic phone format |
| `runCustomValidations` | Caller-supplied custom rules |

## Guidelines honoured (from CLAUDE.md)

1. **Split into smaller, focused functions** — done.
2. **Same validation rules & behaviour** — error messages are byte-for-byte identical to the
   original, so the existing test suite still passes (13/13).
3. **Readability/maintainability** — each helper has one job and a clear name; shared
   validation is reused for both registration and profile paths.
4. **Compatible function signature** — `validateUserData(userData, options)` is unchanged
   (`module.exports = { validateUserData }`), so callers (and `user_store.js`) are unaffected.
5. **Logical grouping** — registration-only, profile-only, and shared validations are grouped
   with comment banners.

## Project setup fix

The starter declared `"type": "module"` in `package.json` while the source and tests used
CommonJS (`require`/`module.exports`). That mismatch prevented Jest from running. I
normalised the project to CommonJS (`package.json` no longer has `"type": "module"`;
`jest.config.js` uses `module.exports`). No validation logic was altered.

## Verification

```bash
cd use-cases/refactor-functions/javascript
npm install
npm test      # 13 passed, 13 total
```
