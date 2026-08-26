# Exercise — Design Pattern Implementation Challenge (Example 1: Strategy, JavaScript)

**Selected sample:** Example 1 — the `calculateShippingCost` shipping calculator with nested
`shippingMethod` × `destinationCountry` conditionals. **Pattern chosen: Strategy** (the brief
names Strategy as the fit, and the code is a textbook case).

**Files** (`use-cases/refactor-functions/javascript/shipping-strategy/`):
- `shipping_original.js` — the brief's nested-conditional version (exported for comparison).
- `shipping.js` — refactored with the Strategy pattern.
- `shipping.test.js` — 37 tests (equivalence matrix + examples + strategy units).

## 1. Analyze the code for pattern opportunities

The function mixes **two orthogonal axes of variation** in one `if/else` ladder:
- *which* shipping method (standard / express / overnight)
- *which* destination country (USA / Canada / Mexico / other)

Each method also carries its own surcharge rule. Adding a method (e.g. `drone`) or a country
means editing the central function and re-testing everything — fragile and noisy. That's the
Strategy signal: **encapsulate the per-method cost logic behind a common interface.**

## 2. Implementation guidance (simulated AI Prompt 2)

> "Refactor `calculateShippingCost` to use the Strategy pattern. Verify my plan: each method
> becomes a strategy with a per-country rate table + surcharge rule; a factory picks the
> strategy; the public function delegates. How do I keep the exact return format (string
> `toFixed(2)`, and the overnight 'not available' message)?"

**AI feedback (simulated):** keep the public signature identical; isolate the rates into a
`METHOD_RATES` table (with a `default` for "other countries"); return the numeric cost from the
strategy and let the public function apply `toFixed(2)`; for unsupported overnight destinations
return the literal message string unchanged so behaviour is preserved.

## 3. Refactored code (Strategy)

```javascript
const METHOD_RATES = {
  standard: { USA: 2.5, Canada: 3.5, Mexico: 4.0, default: 4.5 },
  express:  { USA: 4.5, Canada: 5.5, Mexico: 6.0, default: 7.5 },
  overnight:{ USA: 9.5, Canada: 12.5 }              // no `default` => unsupported => message
};

function getSurcharge(method, { weight, length, width, height }) {
  const volume = length * width * height;
  if (method === 'standard') return (weight < 2 && volume > 1000) ? 5.0 : 0;
  if (method === 'express')  return (volume > 5000) ? 15.0 : 0;
  return 0;
}

function createShippingStrategy(method) {
  const rates = METHOD_RATES[method];
  if (!rates) throw new Error(`Unknown shipping method: ${method}`);
  return {
    calculate(packageDetails, destinationCountry) {
      const explicit = rates[destinationCountry];
      if (explicit === undefined) {
        if ('default' in rates) return packageDetails.weight * rates.default + getSurcharge(method, packageDetails);
        return 'Overnight shipping not available for this destination';
      }
      return packageDetails.weight * explicit + getSurcharge(method, packageDetails);
    }
  };
}

function calculateShippingCost(packageDetails, destinationCountry, shippingMethod) {
  const result = createShippingStrategy(shippingMethod).calculate(packageDetails, destinationCountry);
  return typeof result === 'string' ? result : result.toFixed(2);
}
```

## 4. Tests — behaviour preserved

`shipping.test.js` runs **37 tests**, including an **equivalence matrix** (3 methods × 5
countries × 2 package profiles = 30 cases) asserting the refactored output equals the original
verbatim, plus the brief's published examples (`"12.50"`, `"27.50"`, overnight-Mexico message),
surcharge cases, the international `default` rate, and the unknown-method guard.

```
Tests: 37 passed, 37 total
```

## 5. Benefits gained

- **Open/Closed:** add a shipping method or country by editing `METHOD_RATES` — no touch to the
  branching logic or the public function.
- **Single Responsibility:** each method's rate + surcharge live together; the public function
  only orchestrates.
- **Readability:** the rate table reads like configuration, not a wall of `if/else`.
- **Testability:** strategies can be unit-tested in isolation; the equivalence matrix guards the
  refactor against regressions.

---

## Reflection Questions

**Q1. How did implementing the pattern improve maintainability?**
The central `if/else` ladder (where a typo in one branch silently breaks another country) is
gone. Cost logic per method is now localized and data-driven; reviewing "what does express cost
to Mexico?" is a one-line table lookup instead of tracing nested conditionals.

**Q2. What future changes will be easier because of this pattern?**
- Adding a new method (e.g. `drone`) or a new country → data edit only.
- Changing a surcharge rule → edit `getSurcharge` for that method.
- Supporting per-currency or promotional multipliers → add to the strategy, not the ladder.
- Swapping strategies at runtime (A/B test pricing) becomes trivial since the strategy is an
  object you can inject.

**Q3. Were there any unexpected challenges in implementing the pattern?**
Two subtleties the naive "just extract strategies" approach would miss:
1. **Return-type duality** — valid cases return a *number-string* (`toFixed(2)`) but unsupported
   overnight returns a *message string*. I had to keep that exact contract (strategy returns
   `number | string`; the public function formats only numbers) or tests would break.
2. **The `default` vs "unsupported" distinction** — standard/express treat unknown countries as
   "international" (default rate), but overnight treats them as *unsupported* (message). Modelling
   that required the `default in rates` check rather than blindly falling back. The equivalence
   matrix was what caught these before they shipped.
