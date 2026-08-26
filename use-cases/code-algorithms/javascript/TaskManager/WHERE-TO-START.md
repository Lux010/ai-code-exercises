# Exercise 3 — Knowing Where to Start (JavaScript)

Deliverable for the **"Knowing Where to Start"** exercise. When you are dropped into an
unfamiliar codebase and asked to change something, you need a map of *where the relevant
code lives* before you edit anything. Below is that map for the Task Manager
(`use-cases/code-algorithms/javascript/TaskManager/`).

## Golden rule: follow the dependency arrows

```
cli.js  ──▶  app.js  ──▶  storage.js  ──▶  models.js
```

New behaviour almost always starts at `cli.js` (a new command) and ends at `models.js`
(a new field). Start at the **edge** that the user touches.

## Entry points

| You want to… | Start reading / editing here |
|--------------|------------------------------|
| Change a CLI command or its flags | `cli.js` (the `program.command(...)` block) |
| Add/change business rules (create, list, update, stats) | `app.js` (`TaskManager` class) |
| Change how tasks are saved/loaded or queried | `storage.js` (`TaskStorage` class) |
| Add/change a task field or enum (priority, status) | `models.js` (`Task`, `TaskPriority`, `TaskStatus`) |
| Add a new algorithm (merge / parse / score) | the matching `task_*.js` file, then wire it into `app.js`/`cli.js` |

## Common change requests → exact location

### "Add a new command, e.g. `archive`"
1. `models.js` — if it needs a new status, add it to `TaskStatus`.
2. `app.js` — add `archiveTask(taskId)` on `TaskManager` (likely reuses `updateTask`).
3. `cli.js` — add `program.command('archive <task_id>')` with an `.action` calling it.
4. `storage.js` — only if persistence behaviour changes.

### "Add a new task field, e.g. `assignee`"
1. `models.js` — add `this.assignee = assignee` in the `Task` constructor + parameter.
2. `storage.js` — `load()` must restore it (`task.assignee = taskData.assignee`), and
   `save()` already serialises all props automatically.
3. `cli.js` — add a `-a, --assignee` option on `create` and pass it through.

### "Support a new priority level"
1. `models.js` — add to `TaskPriority` (e.g. `CRITICAL: 5`). **Everywhere else uses the
   enum value**, so `cli.js` help text and `task_priority.js` weight map must be updated too.

### "Change statistics"
1. `app.js` → `getStatistics()` is the single source. Pure in-memory; no storage change.

### "Make parsing understand a new shorthand, e.g. `!crit`"
1. `task_parser.js` → extend the priority regex `/\s!([1-4]|urgent|high|medium|low)\b/i`
   and the `if/else if` mapping.

### "Change how importance is scored"
1. `task_priority.js` → `calculateTaskScore`. `sortTasksByImportance` and
   `getTopPriorityTasks` need no change unless you change the signature.

### "Change where/how data is stored (e.g. a real DB)"
1. `storage.js` — replace the file I/O in `load`/`save`/`addTask`/`updateTask`/
   `deleteTask` and the query helpers. `app.js` and `cli.js` stay the same because they
   only depend on `TaskStorage`'s method names.

## How to find things quickly (without reading everything)

- **Search by symbol, not by file.** Looking for where `DONE` is handled? Grep
  `TaskStatus.DONE` — it appears in `models.js` (definition), `app.js`
  (`updateTaskStatus`), and `task_list_merge.js` (conflict rule).
- **Follow a single command end-to-end** as a "warm-up" read. Example: trace
  `node cli.js status <id> done`:
  `cli.js` `status` action → `taskManager.updateTaskStatus` (`app.js`) →
  `task.markAsDone()` (`models.js`) + `storage.save()` (`storage.js`) → `tasks.json`.
- **Tests are a spec.** `tests/*.test.js` show expected behaviour per module — read the
  test for the module you are about to change first.

## Risk zones (change carefully)

- `storage.save()` rewrites the entire file on every mutation — any change there affects
  *all* commands.
- `models.Task.update()` only copies properties the object already owns; adding a field
  requires updating the constructor, not just `update()`.
- `cli.js` has a top-level `taskManager = new TaskManager()` and
  `program.parse(process.argv)` — the storage file (`tasks.json`) is created on first run,
  so tests that assert on it must isolate the path.
