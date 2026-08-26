# Exercise — Using AI to help with testing (JavaScript Task Manager)

**Lesson:** Using AI to help with testing · **Principle:** *Learn Through Guided Practice*
**Implementation chosen:** JavaScript Task Manager — `calculateTaskScore`,
`sortTasksByImportance`, `getTopPriorityTasks` in
`use-cases/testing-001/javascript/TaskManager/task_priority.js`.
**Deliverables:**
- Code: `task_priority.js` (added the Exercise 3.1 feature) + `tests/task_priority_exercise.test.js` (**27 tests, all passing**; full suite **73/73**).
- This document (Parts 1–4 + Discussion/reflection).

> Per the principle, the AI was used as a *guide* (asking questions, giving hints, reviewing),
> not as a test generator. The tests and code below are written by me.

---

## Part 1 — Understanding What to Test

### Exercise 1.1 — Behavior Analysis (Prompt 1: Behavior Analysis Questions)

**AI (Socratic):** "Before I write anything — what do *you* think `calculateTaskScore` does?"
**Me:** "It turns a task into a number. Bigger priority → bigger number, due-sooner → bigger,
done → smaller, certain tags → bigger, recently touched → bigger."

**AI:** "Good. What behaviors are you *missing*?" → It nudged me toward: (a) the exact
`dueDate` bands (overdue / today / ≤2d / ≤7d / none), (b) the `DONE` vs `REVIEW` penalties,
(c) the recent-update window being **< 1 day**, (d) what happens with a **missing/unknown**
priority, (e) what happens with **no `dueDate`**.

**AI:** "What edge cases do you think matter?" → I listed: no due date, unknown priority,
`updatedAt` exactly at the 1-day boundary, tag list empty, task already `DONE` *and* overdue.
**AI added:** "What about `updatedAt` in the *future* (clock skew)?" and "Does the function
mutate the input?" — both I'd missed.

**AI:** "Which test first, and why?" → I chose **base score scales with priority** because it's
the foundation every other score builds on; if that's wrong, nothing else is trustworthy.

**Resulting list of test cases (≥5, as required):**
1. Base score = `priorityWeight × 10` for each priority; unknown priority → `0` (no crash).
2. Overdue task (`dueDate` in past) → `+30`.
3. Due today (`daysUntilDue === 0`) → `+20`; due ≤2d → `+15`; due ≤7d → `+10`; far future → `0`.
4. `DONE` status → `−50`; `REVIEW` → `−15`.
5. `blocker`/`critical`/`urgent` tag → `+8`.
6. Updated **< 1 day** ago → `+5` (recently-updated boost).
7. **No `dueDate`** → no due-date boost at all.
8. Edge: `updatedAt` in the future (clock skew) → still treated as "recent" (no negative boost).

### Exercise 1.2 — Test Planning (Prompt 2: Test Planning Guidance)

**AI:** "For each behavior you listed, how would you test it?" → I described asserting *exact*
scores (deterministic) rather than `toBeGreaterThan`, so a regression can't silently shift a
value. **AI hint** when I stalled on `dueDate`: "Make the date *relative to now* so the test
isn't flaky — don't hard-code `2025-01-01`."

**Structured test plan:**

| # | Behavior | Type | Depends on | Expected outcome |
|---|----------|------|-----------|------------------|
| 1 | Priority→base score | Unit | `calculateTaskScore` | `LOW=10 … URGENT=40`; unknown `=0` |
| 2 | Overdue boost | Unit | #1, `dueDate` | `+30` |
| 3 | Due-date bands | Unit | #1, `dueDate` (relative) | `+20/+15/+10/0` per band |
| 4 | Status penalty | Unit | #1 | `DONE −50`, `REVIEW −15` |
| 5 | Tag boost | Unit | #1 | `+8` for blocker/critical/urgent |
| 6 | Recent-update boost | Unit | #1, `updatedAt` | `<1d → +5` |
| 7 | Sort order | Unit | #1–6 | array sorted desc, **input not mutated** |
| 8 | Top-N limit | Unit | #7 | returns ≤ `limit` items, highest first |
| 9 | Full workflow | Integration | #1–8 | score→sort→slice coherent end-to-end |

**Priority order:** #1 first (foundation) → #2–#6 (independent leaf behaviors) → #7/#8
(combinators) → #9 (integration). **Test types:** #1–#6 unit; #7/#8 unit (pure functions);
#9 integration (functions composed). **Dependencies:** combinators depend on the leaf scores
being correct, so leaves run first.

---

## Part 2 — Improving a Single Test

### Exercise 2.1 — Writing Your First Test (Prompt 1: Single Test Enhancement)

**My first (basic) test:**
```js
test('urgent scores higher than low', () => {
  expect(calculateTaskScore(urgentTask)).toBeGreaterThan(calculateTaskScore(lowTask));
});
```
**AI:** "What is this *really* verifying — behavior or just ordering? What if both got a +50
bug? Your test would still pass." → It pushed me to assert an **exact expected score**, state
the behavior in the test name, and cover the recently-updated boost explicitly.

**Improved (what's in the suite):**
```js
test('IMPROVED: score = priority*10 + recentlyUpdated(+5) for a plain TODO task', () => {
  const recent = mk({ priority: TaskPriority.HIGH, updatedAt: nowMinus(0.5) }); // 12h ago
  expect(calculateTaskScore(recent)).toBe(35); // 30 (HIGH) + 5 (updated <1d)
});
```
*Why better:* exact value (catches silent regressions), self-documenting name, one behavior per
test.

### Exercise 2.2 — Learning From Examples (Prompt 2: Learning From Test Examples)

**AI:** "For due-date math, a good test pins each `ceil()` boundary, because off-by-one at the
edges is the classic bug." It showed one example using `test.each` over boundary cases with a
comment per band.

**My comprehensive due-date test (in suite):**
```js
const cases = [
  { due: nowMinus(1), expected: 'overdue(+30)', score: 70 },
  { due: nowMinus(0), expected: 'due today(+20)', score: 60 },
  { due: nowPlus(1),  expected: 'due<=2d(+15)',   score: 55 },
  { due: nowPlus(2),  expected: 'due<=2d(+15)',   score: 55 },
  { due: nowPlus(7),  expected: 'due<=7d(+10)',   score: 50 },
  { due: nowPlus(8),  expected: 'no boost',       score: 40 },
];
test.each(cases)('URGENT task $expected', ({ due, score }) => {
  expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT, dueDate: due }))).toBe(score);
});
```
*Precise assertions:* each boundary (including `today`=0 and the `≤2d`/`≤7d` inclusive edges)
is checked; dates are relative to `now` so the suite isn't time-bound.

---

## Part 3 — Test-Driven Development Practice

### Exercise 3.1 — TDD for a New Feature (Prompt 1: Guided TDD Practice)

**Feature:** *Tasks assigned to the current user get a score boost of +12.*

**RED (write failing test first):**
```js
test('task assigned to current user gets +12', () => {
  const t = mk({ priority: TaskPriority.MEDIUM, assignee: 'alice' });
  expect(calculateTaskScore(t, 'alice')).toBe(32); // 20 + 12  → FAILS (returns 20)
});
```
**AI:** "What's the *minimal* code to make this pass?" → **GREEN:** add one guarded line:
```js
if (currentUser && task.assignee === currentUser) score += 12;
```
**Next tests (still TDD):** "no boost when assignee differs" and "no boost when no current user
supplied" (backward-compatible). **Refactor:** signature became `calculateTaskScore(task,
currentUser)` — optional param, so the 46 existing tests keep passing (verified: 73/73).

### Exercise 3.2 — TDD for Bug Fix (Prompt 2-style: TDD Code Review / bug repro)

**Imagined bug:** `daysSinceUpdate` computed as `Math.floor((now - updatedAt) / 1000)` (divides
by milliseconds instead of ms-per-day) — so 12h becomes 43,200 "days" and the `<1 day`
recently-updated boost **never** fires.

**RED (repro test):**
```js
test('a task updated ~12h ago earns the recently-updated +5 boost', () => {
  const t = mk({ priority: TaskPriority.MEDIUM, updatedAt: nowMinus(0.5) });
  expect(calculateTaskScore(t)).toBe(25); // 20 + 5  → FAILS on the buggy /1000 version
});
```
**GREEN (minimal fix):** use the correct divisor `1000*60*60*24`. This test now **guards
against regression** — if anyone reintroduces the ms bug, it fails immediately.

---

## Part 4 — Integration Testing

### Exercise 4.1 — Testing the Full Workflow (Prompt: Integration guidance)

**AI:** "What scenarios exercise *all three* functions together?" → A mix of priorities, due
dates, statuses, tags, and assignees; assert the final top-N list matches a hand-computed
ranking, and that `sortTasksByImportance` **doesn't mutate** its input.

**Integration test (in suite):**
```js
const tasks = [ /* LOW+alice, URGENT overdue+blocker+alice, MEDIUM DONE, HIGH due-soon+bob */ ];
test('sortTasksByImportance: highest score first, input untouched', () => {
  const inputCopy = [...tasks];
  const sorted = sortTasksByImportance(tasks);
  expect(sorted.map(t => calculateTaskScore(t, 'alice'))).toEqual([90, 45, 22, -30]);
  expect(tasks).toEqual(inputCopy);
});
test('getTopPriorityTasks returns top N by score', () => { /* asserts top[0]=90, top[1]=45 */ });
```
**Finding surfaced:** `sortTasksByImportance` / `getTopPriorityTasks` call `calculateTaskScore`
**without** `currentUser`, so per-user boosting isn't reflected in the *ranking* (only when you
re-score the result). Worth a future refactor to thread `currentUser` through. This is exactly
the kind of gap the integration test revealed that unit tests alone missed.

---

## Discussion

### What I produced
- **Test plan (Part 1.2):** prioritized table with types, dependencies, expected outcomes.
- **Improved unit tests (Part 2):** exact-score assertions, `test.each` boundary coverage for
  due dates, recently-updated boost.
- **TDD implementation + tests (Part 3):** the `+12` current-user feature added via
  red-green-refactor; a regression test for the `daysSinceUpdate` divisor bug.
- **Integration test (Part 4):** end-to-end score→sort→top-N, immutability, and the
  currentUser-ranking gap finding.

### Reflection — what I learned about testing through this exercise
1. **Exact assertions beat loose ones.** `toBeGreaterThan` hides regressions; pinning the
   computed number forces the function to earn every point it claims.
2. **Time is a test hazard.** Hard-coded dates flake; *relative-to-now* dates (and pinning
   `updatedAt`) made the suite deterministic.
3. **TDD changes how I think.** Writing the failing test first forced me to define the behavior
   (and its exact expected value) *before* the code existed — far clearer than "write code, then
   tests that match it."
4. **AI as guide > AI as generator.** The Socratic prompts (questions, hints, "what did you
   miss?") built the mental model; pasting generated tests would have taught me nothing and
   likely hidden the `currentUser`-ranking gap.
5. **Integration tests reveal composition bugs.** Unit tests said each function was fine, but
   the integration test exposed that `getTopPriorityTasks` ignores `currentUser` when ranking —
   a real design limitation worth fixing next.

**Verified:** `npm test` in `testing-001/javascript/TaskManager` → **73 passed, 73 total**
(46 pre-existing + 27 from this exercise).
