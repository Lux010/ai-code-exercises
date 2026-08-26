# Exercise — AI Solution Verification Challenge (JavaScript)

**Scenario selected:** The buggy `mergeSort` function (Sample Problem: "Buggy sorting function").
**Starter code:** `use-cases/debug-limitations/javascript/merge_sort.js`
**Final, verified solution:** implemented in `merge_sort.js` (tests: **6/6 pass**).

> Lesson principle applied throughout: **Verify** — restate the AI fix in your own words,
> confirm with other sources, and explore trade-offs *before* trusting it.

---

## 1. The problem & the AI-proposed solution

**Buggy code (from the exercise):**
```javascript
function merge(left, right) {
  let result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) { result.push(left[i]); i++; }
    else { result.push(right[j]); j++; }
  }
  // Bug: Only one of these loops will execute
  while (i < left.length) {
    result.push(left[i]);
    j++; // Bug: incrementing j instead of i
  }
  while (j < right.length) {
    result.push(right[j]);
    j++;
  }
  return result;
}
```

**AI tool asked:** *"This merge sort drops elements / hangs. Find and fix the bug."*
**AI-proposed solution:** In the `left` tail loop, change `j++` → `i++`. The loop copies the
remaining `left` elements, so the `left` cursor `i` must advance; `j` is irrelevant there.

**Final, verified implementation (in `merge_sort.js`):**
```javascript
    // Copy any remaining elements from the left half.
    while (i < left.length) {
        result.push(left[i]);
        i++; // FIX: advance the left index (the original code incremented j, causing an infinite loop / dropped elements)
    }
```

---

## 2. Verification strategy 1 — Collaborative Solution Verification

**My restatement (own words):** The main loop exits when either `left` or `right` is exhausted.
Whatever remains in the *other* half must be copied. The first tail loop handles leftover `left`
elements, so it must advance `i` (the `left` cursor). The original `j++` advanced the *right*
cursor, which is already past its end — `i` never moved, so we re-read `left[i]` forever →
infinite loop (or, if it somehow exited, dropped elements). The fix advances `i`.

**My proposed tests:** empty array, single element, already-sorted, reverse-sorted, duplicates.
**Aspects I was unsure how to test:** *termination on large input* (does the original actually
hang?) and *stability*.

**AI feedback on my plan:** Understanding is accurate. Add (a) one side much longer than the
other, (b) an **already-merged** case (one side empty) to force each tail loop, (c) a property
test: output is sorted **and** a permutation of the input, (d) a fuzz of 1k random arrays, and
(e) a large-array (10k) run to prove termination. Hidden assumption to note: `left`/`right` are
already sorted (they are, by recursion).

**Verification result:** The repo's `tests/merge_sort.test.js` covers all the above (incl. large
array) → **6/6 pass**. Fix confirmed by evidence, not belief.

---

## 3. Verification strategy 2 — Learning Through Alternative Approaches

I asked the AI for 2–3 alternative ways to copy the leftovers and compared them:

1. **`while (i < left.length) { result.push(left[i]); i++; }`** — the chosen fix. Explicit,
   clear for teaching, but the *separate* `i++` line is exactly what was typo'd.
2. **`while (i < left.length) result.push(left[i++]);`** — cursor advance bound to the push, so
   the bug class (incrementing the wrong variable) can't recur. *More robust.*
3. **`result.push(...left.slice(i))`** (after the main loop) — tersest, one allocation, very
   readable. *Cleanest production option.*
4. **`result.concat(left.slice(i), right.slice(j))`** — copy both tails at once.

**Comparison:** all are O(n) and equally scalable. (2)/(3) are *safer* against the original typo
because the cursor advance is inseparable from the push. (1) wins on pedagogical clarity, which
is why it was kept — but I now know (2)/(3) for future use.

---

## 4. Verification strategy 3 — Developing a Critical Eye

**Strengths:** correct, stable, readable; pure functions; exported for testing.
**Concerns / hidden assumptions:**
- Assumes numeric input (`<` comparison); non-numbers need a comparator param.
- Recursion depth ~log2(n) — safe at scale, but deep recursion in other contexts can hit JS
  stack limits; `arr.slice` allocates O(n log n) extra memory (an in-place merge would halve it).
- No input validation — `null` throws an obscure error; a guard would improve the message.
- Maintainability coupling: if a comparator is later added, the tail loops and `<` must change
  together. A `less(a,b)` helper would localise that.

**Improvement adopted:** added the one-line comment at the fix explaining *why* `i++` (not `j++`),
so a future reader cannot reintroduce the typo — directly addressing the biggest concern.

---

## 5. What I learned

- A "working" green test isn't enough — the original bug could *hang* (not just mis-sort), which
  only shows up with a large array or a termination assertion. Verification must include that.
- Restating the fix in my own words exposed that I initially under-tested (happy paths only).
- Exploring alternatives revealed the bug was a *statement-level cursor mistake*, and that
  syntax binding the increment to the push is structurally safer.
- A single explanatory comment converts a repeatable typo into a self-documenting fix.

---

## 6. Reflection questions

**Q1. How did your confidence in the solution change after verification?**
Low → high. Before verification I "knew" `i++` looked right but couldn't prove it. After
restating it, fuzz/property testing it, and confirming 6/6 (including a 10k-element termination
check), I'm confident it's correct *and* I understand *why* — not just that the tests are green.

**Q2. What aspects of the AI solution required the most scrutiny?**
The **termination behaviour**. The AI's one-line fix is tiny and easy to accept, but the real
danger of the original was an *infinite loop*, not merely wrong output. That required reasoning
about loop invariants and an explicit large-input test — the part most likely to be skipped.

**Q3. Which verification technique was most valuable for your specific problem?**
**Collaborative Solution Verification (Prompt 1).** Restating the fix in my own words + the AI
pushing me to add a large-array termination test and a permutation property test is what turned a
plausible-looking patch into a *verified* one. The alternative-approaches step was valuable for
robustness insight, but Prompt 1 caught the correctness gap.
