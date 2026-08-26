# Exercise 8 — AI Solution Verification Challenge (JavaScript)

Deliverable for the **AI Solution Verification Challenge**. An AI assistant produced a
merge-sort implementation (`merge_sort.js`). Our job was to *verify* it rather than trust
it, find the defect, and confirm the fix.

## 1. How the AI solution was verified (don't trust, test)

- Read the code and identified the suspicious section in `merge()` (copying the leftover
  half after the main loop).
- Wrote/ran the existing Jest suite (`tests/merge_sort.test.js`) **before** trusting it.
  The large-array test (`jest.setTimeout(5000)`) is designed to expose the fault.
- Also ran the standalone `node test_merge_sort.js`, which uses `assert` and catches the
  failure explicitly ("likely infinite loop").

## 2. The defect

```js
while (i < left.length) {
    result.push(left[i]);
    j++; // BUG: incrementing j instead of i
}
```

Because `i` never advances, once the main `while (i < left.length && j < right.length)`
loop finishes with leftover elements in `left`, this tail loop either:
- pushes the **same** `left[i]` forever (when `i` is already ≥ `right.length`, the
  condition `i < left.length` stays true) → **infinite loop / timeout**, or
- drops elements / duplicates values when `left` is the longer half.

The comment in the original code even hints at the confusion: *"Only one of these loops
will execute"* — true, but the wrong index was incremented.

## 3. The fix

```js
while (i < left.length) {
    result.push(left[i]);
    i++; // advance the LEFT index
}
```

The right-tail loop (`while (j < right.length)`) was already correct.

## 4. Verification after the fix

```
npm install && npx jest
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

All six cases pass, including the 100-element random array, which previously timed out.
The standalone `node test_merge_sort.js` now prints "All tests completed" with no errors.

## 5. Lesson

An AI-generated algorithm can *look* correct and even pass small hand-picked tests while
being fundamentally broken on edge cases (here, unequal half lengths). Verification
requires (a) property-based / randomised tests and (b) reasoning about the loop invariants,
not just trusting the prose explanation.
