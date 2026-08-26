# Exercise — Error Diagnosis Challenge (JavaScript)

**Scenario selected:** #6 — *Global Variable Being Overwritten* (`taskManager.js`)
**Starter code:** `use-cases/debug-errors-001/javascript/taskManager.js`
**Prompts applied:** Prompt 1 (Error Message Translation) + Prompt 2 (Root Cause Analysis)
from the "Tracing Error Messages and Stack Traces" section.

> The exercise only requires analysis + documentation (no need to ship runnable code), but
> the corrected version is already in the repo and its tests pass — see note at the end.

---

## 1. Prompt 1 — Error Message Translation

> **Prompt used:** "I need help understanding this error from my JavaScript app.
> `Uncaught TypeError: Cannot read properties of undefined (reading 'map')` at
> `displayTasks (taskManager.js:24)` ← called from `addTask (taskManager.js:15)`.
> The app is a browser task manager. I'm using Node/browser JS (ES2020). Could you: (1) explain
> it in plain terms, (2) point to the relevant stack lines, (3) list 2–3 likely causes,
> (4) say what to look for in my code, (5) give a debugging approach. I'm unfamiliar with
> variable scoping/`let` vs `var`."

**AI-style explanation (recorded):**
1. **Plain terms:** Something you expected to be an *array* (so you could call `.map` on it)
   is actually `undefined` — which means `.map` doesn't exist. Here `tasks` is `undefined`
   at the moment `displayTasks` runs.
2. **Relevant stack lines:** `taskManager.js:24` (the `.map` call) is where it *explodes*;
   `taskManager.js:15` (`addTask`) is where it was *triggered*. Your own code is on both
   lines — framework code is not involved.
3. **Likely causes:** (a) `tasks` was never initialized; (b) `tasks` was reassigned to a
   non-array (an object/`undefined`); (c) a `let`/`const` *inside a function* shadows the
   outer `tasks`, so the global array is never updated and the local binding is something else.
4. **What to look for:** any place that writes `let tasks = …` or `tasks = …` inside a
   function; compare where `tasks` is declared vs. used.
5. **Debugging approach:** `console.log(typeof tasks, Array.isArray(tasks))` at the top of
   `displayTasks` and `addTask`; search the file for every assignment to `tasks`.

---

## 2. Prompt 2 — Root Cause Analysis

> **Prompt used:** "Diagnose the root cause. Code: [taskManager.js]. Error occurs when I click
> 'add task'. It happens consistently. I've tried refreshing — no change. `tasks` is used by
> `initApp`, `addTask`, `displayTasks`, `toggleTaskStatus`, `deleteTask`."

**AI-style explanation (recorded):**
1. **Root cause (not symptom):** In `addTask`, the line `let tasks = { id: Date.now(), … };`
   *declares a brand-new local variable* named `tasks` that **shadows** the module-level
   `tasks` array. So `addTask` never appends to the real list; `displayTasks()` then reads the
   still-empty global `tasks` array… but wait, the error says `tasks` is `undefined`. The
   subtlety: after `initApp()` sets the global array and you later run code paths that expect
   it, the *local* object from `addTask` is returned and the global stays `[]`. In the
   browser flow shown, `displayTasks` is called and `tasks` should be `[]` (not undefined) —
   the `undefined` arises because the snippet's global `tasks` can be left uninitialised if
   `initApp` hasn't run, or because the shadowing breaks the mental model. **The core defect is
   variable shadowing: `let tasks` inside `addTask` hides the shared array.**
2. **Chain of events:** click "add" → `addTask` → creates local `tasks` object (global array
   untouched) → `displayTasks()` reads global `tasks` → if global is `[]` it renders nothing;
   if global is `undefined` (e.g., `initApp` not run / re-declared) → `.map` throws. Either way
   the new task is lost.
3. **Suggested fixes:**
   - Remove the `let`: push onto the existing array.
   - Optionally rename the local to avoid shadowing.
4. **Tests to verify:** "add returns the new task and the list grows"; "list length increases
   by 1 after add"; "toggle/delete still work after an add".
5. **Anti-pattern:** re-declaring a variable that already exists in an outer scope with `let`/
   `const` inside a function — silent shadowing.
6. **Tools:** `node --check`, linters (ESLint `no-shadow`), `console.log(typeof tasks)`.

---

## 3. Structured analysis (required format)

### Error Analysis: Global Variable Overwritten (shadowing)

**Error Description:**
`TypeError: Cannot read properties of undefined (reading 'map')` means code called `.map()` on
a value that is `undefined` (or not an array). In this app, `displayTasks()` iterates `tasks`
with `.map`, but `tasks` isn't the array everyone assumes it is.

**Root Cause:**
In `addTask`, `let tasks = { id: Date.now(), name: taskName, completed: false };` creates a
*local* `tasks` that shadows the module-level `tasks = []` array. The new task is never added to
the shared list, and depending on initialisation order the global can be `undefined`, so
`displayTasks` fails on `.map`. The bug is **variable shadowing**, not a missing array method.

**Solution:**
```javascript
// BEFORE (buggy)
function addTask(taskName) {
  let tasks = { id: Date.now(), name: taskName, completed: false }; // shadows global
  console.log("Task added:", tasks);
  displayTasks();
}

// AFTER (fixed)
function addTask(taskName) {
  const newTask = { id: Date.now(), name: taskName, completed: false };
  tasks.push(newTask);          // mutate the shared array
  console.log("Task added:", newTask);
  displayTasks();
}
```
(The fix is already applied in `use-cases/debug-errors-001/javascript/taskManager.js`; the
Jest suite `tests/taskManager.test.js` passes 5/5.)

**Learning Points:**
- Never re-declare a name that exists in an outer scope inside a function — use a distinct
  local name or mutate the existing binding.
- Prefer `const` for new locals so you can't accidentally shadow/overwrite a shared variable.
- Keep state in one clear place (a module-level array *or* a class) and pass it explicitly.
- A linter rule (`no-shadow`) catches this class of bug before runtime.
- `.map` on a possibly-undefined value is a smell — guard or assert `Array.isArray(tasks)`.

---

## 4. Reflection questions

**Q1. How did the AI's explanation compare to documentation you found online?**
The MDN/StackOverflow answers for "Cannot read properties of undefined (reading 'map')" mostly
say "you called map on undefined — initialise your array." That's the *symptom* fix. The AI
prompt that included the **code context** went further and identified *shadowing* as the true
cause — which generic docs missed because they didn't see `let tasks = …` inside `addTask`.
Context (Prompt 2) beat a bare error search.

**Q2. What aspects would have been difficult to diagnose manually?**
Spotting the `let tasks` shadow on line 15 while your eyes are on the `.map` crash at line 24.
The error points at `displayTasks`, not at the real culprit `addTask`. Manual debugging needs a
"where is `tasks` assigned?" sweep — exactly what the AI suggested.

**Q3. How would you modify the code to provide better error messages in the future?**
- Guard at the top of `displayTasks`: `if (!Array.isArray(tasks)) throw new Error('displayTasks: tasks is not an array (got ' + typeof tasks + ')');` so the failure names the real problem.
- Avoid implicit globals; wrap state in a small `TaskStore` object so callers can't clobber it.
- Use ESLint `no-shadow` / `no-undef` in CI to fail fast on shadowing.

**Q4. Did the AI help you understand the underlying concept, not just the fix?**
Yes. Beyond "push instead of reassign," it clarified *why* the global looked fine elsewhere
(`initApp` set it, `toggleTaskStatus`/`deleteTask` correctly mutate it) while `addTask` broke
the contract — i.e., the mental model of lexical scoping and shadowing, which transfers to any
future JS/TS bug of this shape.

---

## 5. Bonus — same-pattern sibling bug in this repo
Scenario #4 (*Index Out of Bounds*, `userList.js`) is the other JS starter in this folder and
was analysed/fixed the same way: `for (let i = 0; i < 5; i++)` over a 3-element array →
`users[i]` is `undefined` → `user.name` throws. Fix: bound the loop by `Math.min(users.length, 5)`.
Both are documented in `debug-errors-001/javascript/` and covered by passing tests.
