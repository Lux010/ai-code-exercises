# Exercise 2 — Algorithm Deconstruction Challenge (JavaScript)

This is the deliverable for the **Algorithm Deconstruction Challenge**. It breaks down the
three non-trivial algorithms in the Task Manager starter code
(`use-cases/code-algorithms/javascript/TaskManager/`):

1. `task_list_merge.js` — synchronising two task lists (conflict resolution)
2. `task_parser.js` — parsing free-form task text into structured fields
3. `task_priority.js` — scoring & ranking tasks by importance

For each I give: the goal, the step-by-step algorithm, the data structures, complexity,
and the subtle "gotchas" worth flagging.

---

## 1. `mergeTaskLists` / `resolveTaskConflict` (`task_list_merge.js`)

### Goal
Merge a `localTasks` map and a `remoteTasks` map (both keyed by `taskId`) into one
consistent set, while reporting what must be written back to each side so both stay in
sync. This is the classic offline-sync / two-way-merge problem.

### Top-level algorithm (`mergeTaskLists`)
1. Collect the **union** of all task ids into a `Set` (`allTaskIds`).
2. For each id, classify into one of three cases:
   - **Local only** → copy to `mergedTasks`, record in `toCreateRemote`.
   - **Remote only** → copy to `mergedTasks`, record in `toCreateLocal`.
   - **Both** → call `resolveTaskConflict(local, remote)`; put the merged task into
     `mergedTasks` and, depending on its return flags, into `toUpdateLocal` and/or
     `toUpdateRemote`.
3. Return `{ mergedTasks, toCreateRemote, toUpdateRemote, toCreateLocal, toUpdateLocal }`.

### Conflict resolution (`resolveTaskConflict`) — the interesting part
Inputs: two versions of the same task. Outputs: `[mergedTask, shouldUpdateLocal, shouldUpdateRemote]`.

Steps:
1. Start from a copy of the **local** task as the base (`mergedTask = {...localTask}`).
2. Compare timestamps `localDate` vs `remoteDate` (parsed from `updatedAt`).
   - If **remote is newer**, copy `title`, `description`, `priority`, `dueDate` from
     remote into merged, and set `shouldUpdateLocal = true`.
   - Otherwise, local wins and `shouldUpdateRemote = true`.
3. **Completed-status special rule** (overrides timestamp for the `status` field):
   - If remote is DONE and local is not → take remote's status & `completedAt`,
     `shouldUpdateLocal = true`.
   - If local is DONE and remote is not → keep local, `shouldUpdateRemote = true`.
   - If both have *different non-done* statuses → most-recent timestamp wins (same rule
     as step 2).
4. **Tags** are merged as a **set union** (`[...new Set([...local.tags, ...remote.tags])]`).
   If the union differs from either side's tags, flag that side for update.
5. Set `mergedTask.updatedAt` to the latest of the two timestamps.

### Data structures
- Input/merged: plain objects keyed by id (effectively `Map<id, Task>`).
- Output deltas: four plain objects of tasks to push.

### Complexity
- Time: `O(N + T)` where `N` = number of unique ids and `T` = total tag-array work
  (union + sort in `arraysEqual`). Tag comparison sorts each tag array → `O(tags·log tags)`
  per task.
- Space: `O(N)` for the merged + delta maps.

### Gotchas / observations
- `arraysEqual` sorts copies before comparing — correct, but `O(k log k)`; a `Set`-based
  compare would be simpler and avoid mutation concerns.
- `updatedAt` is stored as whatever the newer side had, even if only tags changed — fine.
- The "most recent wins" rule can **lose concurrent edits** to different fields (last-writer
  wins per field would be safer). This is a deliberate simplification.
- `dueDate` is copied as a reference; if tasks are shared objects this could alias mutable
  state (here they are freshly loaded, so OK).

---

## 2. `parseTaskFromText` (`task_parser.js`)

### Goal
Turn a single free-text string such as `"Finish report !urgent #fri #work @proj"` into a
`Task` with `title`, `priority`, `dueDate`, and `tags` extracted.

### Algorithm
1. Initialise `title = text.trim()`, `priority = MEDIUM`, `dueDate = null`, `tags = []`.
2. **Priority markers** — regex `/\s!([1-4]|urgent|high|medium|low)\b/i`. If matched:
   - map the captured token to a `TaskPriority` value,
   - strip the marker from `title` with the same regex.
3. **Tags** — regex `/\s@(\w+)/g` collected in a loop (`exec`), then all stripped from
   `title` with `/\s@\w+/g`.
4. **Date markers** — regex `/\s#(\w+)/g` collected into `dates[]`, then all stripped from
   `title`.
5. **Resolve a due date** by scanning `dates` (first match wins, then `break`):
   - `today` / `now` → today (midnight)
   - `tomorrow` → +1 day
   - `next_week` → +7 days
   - weekday name (`mon`…`sun`) → next occurrence via `getNextWeekday`
   - `YYYY-MM-DD` → parsed with `new Date(y, m-1, d)`
6. Collapse whitespace in `title` (`replace(/\s+/g,' ').trim()`).
7. Build a `Task` and assign `priority`, `dueDate`, `tags`; return it.

Helper `getNextWeekday(currentDate, targetDay)`:
- Computes days until the next `targetDay`: `(targetDay + 7 - current.getDay()) % 7`.
- Edge case: if the result lands on *today*, pushes it to next week.

### Data structures
- Strings + regex match arrays; intermediate `dates[]`; final `Task` object.

### Complexity
- Time: `O(n)` for the regex passes over the string (a few linear scans), plus `O(d)`
  date resolutions where `d` = number of `#` markers.
- Space: `O(n)` for the intermediate arrays.

### Gotchas / observations
- The priority regex only captures the **first** `!` marker; multiple are not handled
  (last write would win, but only one is read).
- Because the date loop `break`s on the first recognised token, **only the first** `#`
  marker is used; extra date tokens are ignored.
- `@` and `#` tokens are stripped with global regexes *after* collection — order matters:
  priority first, then tags, then dates, then whitespace collapse.
- `getNextWeekday` uses `Date` arithmetic on a copy — safe, but `setDate` can roll over the
  month, which is intended.

---

## 3. `calculateTaskScore` / `sortTasksByImportance` / `getTopPriorityTasks` (`task_priority.js`)

### Goal
Assign each task a numeric **importance score** and rank tasks so the most important rise
to the top (e.g. for a "what should I do next?" view).

### Scoring algorithm (`calculateTaskScore`)
Base score = `priorityWeight[priority] * 10` where weights are LOW=1, MEDIUM=2, HIGH=3,
URGENT=4 (so 10/20/30/40).

Then adjust:
- **Due-date proximity** (only if `dueDate` set): compute `daysUntilDue`
  (`ceil((due - now)/dayMs)`):
  - overdue (<0) → **+30**
  - due today (0) → **+20**
  - ≤2 days → **+15**
  - ≤7 days → **+10**
- **Status penalty**: DONE → **−50**, REVIEW → **−15** (done/almost-done sink).
- **Tag boost**: if tags include `blocker` / `critical` / `urgent` → **+8**.
- **Recency boost**: updated within the last day → **+5**.

`sortTasksByImportance` copies the array and sorts by `score` descending
(`calculateTaskScore(b) - calculateTaskScore(a)`). `getTopPriorityTasks` slices the top
`limit` (default 5).

### Data structures
- Plain numeric score; arrays sorted in place on a copy.

### Complexity
- `calculateTaskScore`: `O(1)` (constant field checks + one date diff).
- `sortTasksByImportance`: `O(T log T)` where `T` = number of tasks (sort dominates;
  score recomputed per comparison → effectively `O(T log T)` score evaluations, fine for
  typical sizes).

### Gotchas / observations
- `daysUntilDue` uses `Math.ceil`; an overdue task yields a *negative* number caught by the
  `<0` branch, but note `dueDate - now` on `Date` objects returns milliseconds — correct.
- The score is **heuristic**, not normalised — fine for ranking, meaningless in absolute
  terms.
- Calling `calculateTaskScore` inside the comparator recomputes scores repeatedly during
  sort; for very large lists you'd precompute scores once (`Schwartzian transform`) — a
  reasonable optimisation to flag.

---

## Summary table

| Algorithm | Type | Core technique | Complexity | Main risk |
|----------|------|----------------|-----------|-----------|
| `mergeTaskLists` | Two-way sync merge | Case split + last-writer-wins + tag union | `O(N + T·log T)` | Loses concurrent field edits |
| `parseTaskFromText` | Text → struct | Sequential regex extraction | `O(n)` | Only first `!`/`#` used |
| `calculateTaskScore` | Heuristic ranking | Weighted additive score + sort | `O(T log T)` | Score recomputed in comparator |
