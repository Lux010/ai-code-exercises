# Code Understanding Journal — Task Manager (JavaScript)

> Exercise 1: **Codebase Exploration Challenge**. Goal: understand existing code *without
> changing it*, using three AI prompt strategies. Language chosen: **JavaScript** (starter
> at `use-cases/code-comprehension-001/javascript/TaskManager/`). This journal records the
> process, the prompts used, the findings, and the reflections. No code was modified.

---

## Part 1 — Understanding a Specific Feature
**Prompt strategy used:** *Prompt 1 — "Understand how a specific feature works"*
**Feature:** task creation and status updates.

### Prompt I gave the AI
> "Explain how task **creation** and **status updates** work in this Node.js Task Manager.
> Here are the relevant snippets: `cli.js` (`create` and `status` commands),
> `app.js` (`createTask`, `updateTaskStatus`), `storage.js`, and `models.js` (`Task`,
> `markAsDone`). Walk me through the main components, the execution flow, and how data is
> stored/retrieved."

### Findings recorded

**Main components involved**
- `cli.js` — parses `node cli.js create <title> …` / `status <id> <status>` via `commander`
  and prints results.
- `app.js` → `TaskManager` — business logic façade. `createTask(...)` builds a `Task`;
  `updateTaskStatus(id, status)` special-cases `DONE`.
- `models.js` → `Task` — holds state; `markAsDone()` sets `status=DONE` + `completedAt`.
- `storage.js` → `TaskStorage` — in-memory map keyed by `id`, mirrored to `tasks.json`.

**Execution flow — create**
```
cli "create" action
  → taskManager.createTask(title, description, priority, due, tags)
      → new Task(...)                       // uuid id, status=TODO
      → storage.addTask(task)               // tasks[id]=task
      → storage.save()                      // rewrite tasks.json
  → cli prints "Created task with ID: <uuid>"
```

**Execution flow — status update**
```
cli "status <id> <status>" action
  → taskManager.updateTaskStatus(id, status)
      → if status === DONE: task.markAsDone()   // sets completedAt
      → else: storage.updateTask(id, { status }) // generic field update
      → storage.save()
```

**How data is stored / retrieved**
- Stored as a JSON array in `tasks.json`; loaded entirely into `this.tasks` (object) on
  construction. Every mutation rewrites the whole file (`save()`).
- Retrieved by `getTask(id)` → `this.tasks[id]` (O(1) map lookup).

**Design patterns discovered**
- **Facade** (`TaskManager` hides storage details from the CLI).
- **Dependency injection** (storage path passed to constructor).
- **Anemic-ish entity** — `Task` carries behaviour (`markAsDone`, `isOverdue`) but storage
  is separate (close to a lightweight Active-Record-ish split).
- **In-memory cache + file persistence** (simple, not transactional).

---

## Part 2 — Deepen Understanding Through Guided Questions
**Prompt strategy used:** *Prompt 2 — "Deepen understanding of a codebase"*
**Focus:** the task prioritization system (`task_priority.js`).

### Initial understanding (before guided questions)
I thought priority was just the enum `1..4` and tasks were sorted by it directly. I assumed
`calculateTaskScore` returned the priority number.

### Prompt I gave the AI
> "Here is my understanding of the prioritization code: tasks have a numeric priority and
> are sorted by it. Ask me 4–5 guided questions that will reveal whether my understanding is
> complete, then I'll answer each by reading the code."

### Guided questions the AI posed (and my code-backed answers)
1. **"How is `priority` combined with other signals like due date?"**
   → `calculateTaskScore` starts at `priorityWeight*10` then *adds* a due-date factor
   (+30 overdue, +20 today, +15 ≤2d, +10 ≤7d). So due date can outweigh raw priority.
2. **"What happens to completed or in-review tasks in the score?"**
   → DONE gets −50, REVIEW gets −15. Completed tasks sink to the bottom on purpose.
3. **"Are scores normalised or comparable across lists?"**
   → They are a heuristic sum, *not* normalised — meaningful only for ranking within a set.
4. **"How are tags used?"**
   → Tags `blocker`/`critical`/`urgent` add +8; `updated within a day` adds +5.
5. **"Is the score recomputed efficiently during sort?"**
   → `sortTasksByImportance` calls `calculateTaskScore` inside the comparator → recomputed
   per comparison (fine for small N; a Schwartzian transform would precompute for large N).

### Journal reflection (Part 2)
- **Initial vs discovered:** my "just sort by priority" mental model was wrong; it's a
  weighted additive score where recency, due date, status, and tags all matter.
- **Key insights:** last-writer-style ranking where *overdue* beats *urgent*, and done work
  is deliberately de-prioritised.
- **Misconceptions clarified:** priority is only ~40% of the max score; "importance" ≠
  "priority level".

---

## Part 3 — Mapping Data Flow
**Prompt strategy used:** *Prompt 3 — "Mapping Data Flow and State Management"*
**Trigger:** a task is marked as **complete** (`node cli.js status <id> done`).

### Prompt I gave the AI
> "Map the complete data flow when a task is marked complete. Identify entry points, the
> state changes, points of failure, and how the change is persisted. Code: `cli.js`,
> `app.js`, `storage.js`, `models.js`."

### Data-flow diagram
```
            ┌──────────────────────────────────────────────────────┐
cli.js      │ program.command('status <id> <status>') .action(...)  │
            └───────────────┬──────────────────────────────────────┘
                            │ taskManager.updateTaskStatus(id, 'done')
                            ▼
app.js      ┌──────────────────────────────────────────────────────┐
            │ if status === DONE:                                    │
            │   task = storage.getTask(id)                           │
            │   task.markAsDone()  ── sets status=DONE,             │
            │                        completedAt=now, updatedAt=now  │
            │   storage.save()                                       │
            └───────────────┬──────────────────────────────────────┘
                            │
storage.js  ┌───────────────┴──────────────────────────────────────┐
            │ save(): JSON.stringify(Object.values(tasks)) ➜ tasks.json
            └───────────────────────────────────────────────────────┘
```

### State changes during completion
- `status`: `TODO/IN_PROGRESS/REVIEW` → `DONE`.
- `completedAt`: `null` → current `Date`.
- `updatedAt`: bumped to `now`.
- `id`, `title`, `priority`, `dueDate`, `tags`: unchanged.

### Potential points of failure
- **Missing task** — `getTask(id)` returns `undefined`; `markAsDone` would throw. The code
  guards with `if (task)` and returns `false`, but `status`/`priority` updates have the same
  guard while `due` does not (returns `false` on bad date). Inconsistent.
- **Write failure** — `save()` swallows `writeFileSync` errors (logs only); the in-memory
  map and file can desync silently.
- **No atomicity / concurrency** — two quick updates can interleave; last writer wins, no
  lock.
- **Wrong id** — ids are UUIDs; a typo'd id silently reports "Task not found".

### How changes persist
`markAsDone()` mutates the `Task` object that lives in `storage.tasks[id]` (same reference),
then `save()` serialises the entire map to `tasks.json`. On next launch `load()` reconstructs
each `Task` (re-parsing date strings) so `DONE`/`completedAt` survive a restart.

---

## Part 4 — Reflection & Presentation
*(3–5 minute talk outline — process-focused, not a code dump)*

**1. High-level architecture (≈45s)**
- Four layers: CLI (`commander`) → `TaskManager` (logic) → `TaskStorage` (persistence) →
  `Task` model. Data flows CLI → logic → storage → JSON file, and back on read.

**2. Three key features (≈2min)**
- *Creation*: CLI args → `createTask` builds a `Task` (uuid, defaults) → stored + file saved.
- *Prioritization*: not a sort by priority — a weighted score (priority + due-date proximity
  − completion + tag/recency boosts) ranked by `sortTasksByImportance`.
- *Completion*: `status done` → `markAsDone()` flips state and stamps `completedAt` →
  persisted to `tasks.json`.

**3. One interesting pattern (≈30s)**
- The **Facade** + **in-memory cache with full-file persistence**: simple to reason about,
  but every change rewrites the whole file and there's no transaction — a deliberate
  trade-off in starter code.

**4. Most challenging + how prompts helped (≈1min)**
- Hardest: the prioritization scoring (many hidden signals). *Prompt 2*'s guided questions
  exposed that due date and tags matter as much as priority. *Prompt 3* made the completion
  data flow concrete and surfaced the silent-failure risks in `save()`. The prompts pushed me
  from "read and guess" to "verify against the code".

**Process takeaways**
- Understanding > critiquing (per the brief).
- Specific prompts + real code snippets beat vague questions.
- Diagrams (above) made component relationships click.
- The three strategies map to needs: *feature* (Prompt 1), *depth* (Prompt 2), *flow/state*
  (Prompt 3).

---

## Appendix — Prompt strategies used
| Part | Strategy | What it was good for |
|------|----------|----------------------|
| 1 | Understand a specific feature | Component + flow of create/status |
| 2 | Deepen understanding (guided questions) | Uncovering scoring nuances & misconceptions |
| 3 | Map data flow & state | Completion path, state changes, failure points |
