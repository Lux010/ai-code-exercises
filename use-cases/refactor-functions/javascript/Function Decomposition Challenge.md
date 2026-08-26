# Exercise — Function Decomposition Challenge (JavaScript)

**Selected function:** the *Data Validation Function with Nested Conditionals* —
`validateUserData(userData, options)` from the exercise brief (a ~150-line monolithic
validator for user registration/profile updates).

**Verification:** `npm test` in `refactor-functions/javascript` → **29 passed** (13 behaviour
tests in `user_validator.test.js` + 16 equivalence tests in
`decomposition_equivalence.test.js`). The equivalence test runs the **original monolith**
(copied verbatim into the test) against the **refactored** module on 16 shared fixtures and
asserts identical error arrays — proof the decomposition preserved behaviour.

---

## 1. Distinct responsibilities identified

| # | Responsibility | Evidence in the monolith |
|---|----------------|--------------------------|
| R1 | Registration required-field check | `requiredForRegistration` loop |
| R2 | Username format + uniqueness | nested `if/else if` chain |
| R3 | Password strength + confirmation match | nested `if/else if` chain |
| R4 | Profile-update required-field check | `requiredForProfile` loop (else branch) |
| R5 | Email format + uniqueness | separate `if (userData.email …)` block |
| R6 | Date-of-birth validity + age bounds | `if (userData.dateOfBirth …)` block |
| R7 | Address field presence + country ZIP format | `if (userData.address …)` block |
| R8 | Phone format | `if (userData.phone …)` block |
| R9 | Custom user-supplied validations | `options.customValidations` loop |

Each is independent and appends to the shared `errors` array → each became its own helper.

## 2. Decomposition plan

- Keep the public `validateUserData(userData, options)` signature and the **exact same error
  messages** (behaviour-preserving).
- Extract R1–R9 into single-purpose functions, grouped: *registration* (`validateRequiredRegistrationFields`,
  `validateUsername`, `validatePassword`), *profile* (`validateRequiredProfileFields`),
  *shared* (`validateEmail`, `validateDateOfBirth`, `validateAddress`, `validatePhone`,
  `runCustomValidations`).
- The main function becomes an orchestrator: build `errors`, call the helpers in the original
  order, return `errors`.

## 3. Refactored main function (orchestrator)

```javascript
function validateUserData(userData, options = {}) {
  const errors = [];
  const isRegistration = options.isRegistration || false;

  if (isRegistration) {
    validateRequiredRegistrationFields(userData, errors);
    validateUsername(userData, options, errors);
    validatePassword(userData, errors);
  } else {
    validateRequiredProfileFields(userData, errors);
  }

  validateEmail(userData, options, errors);
  validateDateOfBirth(userData, errors);
  validateAddress(userData, errors);
  validatePhone(userData, errors);
  runCustomValidations(userData, options, errors);

  return errors;
}
```
*(Full helper implementations live in `user_validator.js`. Example helper:)*
```javascript
function validateUsername(userData, options, errors) {
  if (!userData.username) return;
  if (userData.username.length < 3) errors.push('Username must be at least 3 characters long');
  else if (userData.username.length > 20) errors.push('Username must be at most 20 characters long');
  else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) errors.push('Username can only contain letters, numbers, and underscores');
  else if (options.checkExisting && options.checkExisting.usernameExists(userData.username)) errors.push('Username is already taken');
}
```

## 4. Tests — behaviour preserved

- `user_validator.test.js` (pre-existing, 13 tests): required fields, username/password rules,
  email, date-of-birth bounds, profile fields, custom validations, and valid-data → `[]`.
- `decomposition_equivalence.test.js` (new, 16 tests): the **original monolith** vs the
  **refactored** module on 16 fixtures (valid/invalid registration, profile, object addresses,
  phone, custom rules, and `checkExisting` stubs). All assert `actual` equals `expected`.

## 5. Benefits gained

- **Readability:** each rule is now a ~5-line, named function you can read in isolation instead
  of scrolling a 150-line wall of nested `if`s.
- **Maintainability / SRP:** changing the password policy touches only `validatePassword`;
  adding a rule = one new helper + one call, not editing the monolith.
- **Testability:** helpers can be unit-tested directly; the equivalence harness guards against
  regressions.
- **Bonus latent-bug fix:** the original monolith called `userData[field].trim()` on profile
  fields even when `address` was an **object**, crashing on `address` in profile updates. The
  refactored `validateRequiredProfileFields` checks `=== ''` (not `.trim()`), so object
  addresses no longer crash — decomposition surfaced and removed a real defect.

---

## Reflection Questions

**Q1. How did breaking down the function improve its readability and maintainability?**
Dramatically. The monolith mixed validation *rules* with *control flow*; you had to trace
nested `if/else if` chains to find one rule. After decomposition, `validateUsername` says
exactly what it does in its name and body, and the orchestrator reads like a checklist. A
future dev can change password policy or add a field without touching unrelated logic — the
essence of the Single Responsibility Principle.

**Q2. What was the most challenging part of decomposing the function?**
Preserving the **exact error-message text and ordering**. The monolith appended messages in a
specific sequence (registration fields → username → password → email → dob → address → phone →
custom); if a helper pushed in a different order, tests would fail even though "logic" was
equivalent. I solved this by keeping the orchestrator's call order identical to the original
block order and writing the equivalence test to catch any divergence.

**Q3. Which extracted function would be most reusable in other contexts?**
`validateEmail` and `validateAddress` (especially the country-aware ZIP check). Email/address
validation recurs in nearly every form, API, or import pipeline, so they can be lifted into a
shared `validators` module. `validatePassword` (strength policy) is also reusable wherever
account creation happens.
