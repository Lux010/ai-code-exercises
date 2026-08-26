# Exercise 3 — Code Documentation (JavaScript)

**Algorithm chosen:** *Algorithm 1 — Task Priority Sorting & Filtering*
(`use-cases/code-algorithms/javascript/TaskManager/task_priority.js`)

This document follows the exercise's required submission format: original code → Prompt 1
output → Prompt 2 output → final combined version → reflections.

---

## A. Original code I chose to document

```javascript
function calculateTaskScore(task) {
  // Base priority weights
  const priorityWeights = {
    [TaskPriority.LOW]: 1,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.HIGH]: 3,
    [TaskPriority.URGENT]: 4
  };

  // Calculate base score from priority
  let score = (priorityWeights[task.priority] || 0) * 10;

  // Add due date factor (higher score for tasks due sooner)
  if (task.dueDate) {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {  // Overdue tasks
      score += 30;
    } else if (daysUntilDue === 0) {  // Due today
      score += 20;
    } else if (daysUntilDue <= 2) {  // Due in next 2 days
      score += 15;
    } else if (daysUntilDue <= 7) {  // Due in next week
      score += 10;
    }
  }

  // Reduce score for tasks that are completed or in review
  if (task.status === TaskStatus.DONE) {
    score -= 50;
  } else if (task.status === TaskStatus.REVIEW) {
    score -= 15;
  }

  // Boost score for tasks with certain tags
  if (task.tags.some(tag => ["blocker", "critical", "urgent"].includes(tag))) {
    score += 8;
  }

  // Boost score for recently updated tasks
  const now = new Date();
  const updatedAt = new Date(task.updatedAt);
  const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate < 1) {
    score += 5;
  }

  return score;
}

function sortTasksByImportance(tasks) {
  // Create a copy of the tasks array to avoid modifying the original
  return [...tasks].sort((a, b) => {
    return calculateTaskScore(b) - calculateTaskScore(a);
  });
}

function getTopPriorityTasks(tasks, limit = 5) {
  const sortedTasks = sortTasksByImportance(tasks);
  return sortedTasks.slice(0, limit);
}
```

---

## B. Prompt 1 output — Comprehensive function documentation (JSDoc)

> **Prompt used:** "Create comprehensive JSDoc for these functions. Include: description,
> all parameters with types, return value with type, exceptions/errors, example usage, and
> important edge cases." (Refined after first pass to also ask for *no-exceptions* clarity
> and the exact numeric weights.)

```javascript
/**
 * Compute a heuristic importance score for a task.
 *
 * Base = `priorityWeight * 10`. Adjustments (additive):
 * - Due date proximity: overdue +30, due today +20, ≤2 days +15, ≤7 days +10.
 * - Status: DONE −50, REVIEW −15.
 * - Tags `blocker`/`critical`/`urgent`: +8.
 * - Updated within the last day: +5.
 *
 * @param {object} task - Task with `priority`, `dueDate?`, `status`, `tags[]`, `updatedAt`.
 * @returns {number} The computed importance score (higher = more important).
 * @throws {TypeError} If `task` or required fields are missing/undefined (no explicit
 *   guarding — the function assumes a well-formed Task).
 *
 * @example
 * const score = calculateTaskScore(new Task('Fix prod', '', TaskPriority.URGENT,
 *   new Date('2000-01-01'), ['blocker'])); // overdue + urgent + blocker
 */
function calculateTaskScore(task) { /* … */ }

/**
 * Return a new array of tasks sorted by importance (highest score first).
 * @param {object[]} tasks - Tasks to rank.
 * @returns {object[]} A new, sorted array (the input is not mutated).
 */
function sortTasksByImportance(tasks) { /* … */ }

/**
 * Return the `limit` most important tasks.
 * @param {object[]} tasks - Tasks to rank.
 * @param {number} [limit=5] - Maximum number of tasks to return.
 * @returns {object[]} The top-ranked tasks (highest score first).
 */
function getTopPriorityTasks(tasks, limit = 5) { /* … */ }
```

**Review notes:** The first AI pass omitted that *no exceptions are deliberately thrown*
and glossed over the exact weights. I adjusted the prompt ("state explicitly that no
exceptions are raised; list the exact +/− values") and got a complete version.

---

## C. Prompt 2 output — Intent & logic explanation

> **Prompt used:** "Explain the intent and logic of this code at a high level; break it down
> step-by-step; identify assumptions/edge cases; suggest inline comments for complex parts;
> note potential improvements without changing behaviour."

**High-level intent:** rank tasks so a user sees the most urgent/important work first. The
score is a weighted sum, not a normalised metric.

**Step-by-step:**
1. `priorityWeights` maps enum → 1..4; base score = weight × 10.
2. If `dueDate` exists, compute `daysUntilDue` (ceil of ms diff). Bucket it: overdue/today/
   ≤2d/≤7d add 30/20/15/10.
3. Status penalty: DONE −50, REVIEW −15 (done work sinks).
4. Tag boost: any of `blocker`/`critical`/`urgent` → +8.
5. Recency boost: updated < 1 day ago → +5.
6. `sortTasksByImportance` copies the array and sorts by `score(b) − score(a)` (desc).
7. `getTopPriorityTasks` slices the top `limit`.

**Assumptions / edge cases identified:**
- `task.dueDate` may be a string or `Date` (code re-wraps in `new Date(...)`).
- `task.priority` not in the map → `undefined * 10` → `NaN`, but `|| 0` guards it to 0.
- Timezone: `daysUntilDue` is computed in the runtime's local timezone; an overdue check
  near midnight can flip across timezones.
- The comparator **recomputes `calculateTaskScore` on every comparison** → O(n log n)
  rescoring; fine for small lists, wasteful for large ones.
- Score is *relative*, not absolute — don't compare scores across different task sets.

**Suggested inline comments (complex part):**
```javascript
// Recency boost: a task touched in the last 24h gets a small nudge so active work
// surfaces above otherwise-equal stale tasks.
if (daysSinceUpdate < 1) score += 5;
```

**Potential improvements (behaviour preserved):**
- Precompute scores once (Schwartzian transform: `tasks.map(t => [t, score(t)]).sort(...)`)
  to avoid recomputation in the comparator.
- Make weights configurable instead of hard-coded magic numbers.
- Normalize or expose the components so callers can debug *why* a task ranked where it did.

---

## D. Final combined documentation version

This is the polished result (also committed into `task_priority.js`):

```javascript
/**
 * Compute a heuristic importance score for a task.
 *
 * Higher = more important. Base = `priorityWeight * 10`. Adjustments:
 * due-date proximity (+10…+30, strongest when overdue), status penalty
 * (DONE −50, REVIEW −15), blocker/critical/urgent tag boost (+8), and a
 * recently-updated boost (+5).
 *
 * @param {object} task - A Task with `priority`, `dueDate`, `status`, `tags`, `updatedAt`.
 * @returns {number} The computed importance score.
 * @throws {TypeError} If `task` is undefined (fields are assumed well-formed).
 *
 * @example
 * calculateTaskScore(new Task('Fix prod', '', TaskPriority.URGENT,
 *   new Date('2000-01-01'), ['blocker']));
 */
function calculateTaskScore(task) { /* … */ }

/**
 * Return a new array of tasks sorted by importance (highest score first).
 * @param {object[]} tasks - Tasks to rank.
 * @returns {object[]} A new, sorted array (input not mutated).
 */
function sortTasksByImportance(tasks) { /* … */ }

/**
 * Return the `limit` most important tasks.
 * @param {object[]} tasks - Tasks to rank.
 * @param {number} [limit=5] - Maximum tasks to return.
 * @returns {object[]} Top-ranked tasks (highest score first).
 */
function getTopPriorityTasks(tasks, limit = 5) { /* … */ }
```

---

## E. Reflections

**Which parts were most challenging for the AI?**
- Capturing the *exact* additive weights (+30/+20/+15/+10/−50/−15/+8/+5) without rounding or
  paraphrasing — first pass said "due date adds a bonus" vaguely.
- Expressing that the score is a **heuristic, not normalised** — easy to imply it's an
  absolute priority value.

**Additional information I had to provide in the prompts**
- Explicitly request JSDoc conventions and "list every parameter and return with type".
- State that *no exceptions are thrown* so the AI wouldn't invent error cases.
- Ask for the concrete numeric edge-case values and a timezone caveat.

**How I'd use this approach in my own projects**
- Generate JSDoc as a **first draft** in PRs for new/complex functions, then review against
  real behaviour (the exercise's "review for accuracy" step caught the missing no-throw
  note and the weight vagueness).
- Keep Prompt 2 for onboarding: the intent/logic + improvement notes make a great PR
  description or architecture comment.
- Treat AI docs as a starting point, never the source of truth — verify against the code,
  as the lesson's "Documentation That Doesn't Match Code Behavior" pitfall warns.
