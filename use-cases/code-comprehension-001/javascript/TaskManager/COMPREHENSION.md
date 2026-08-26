# Exercise 1 — Code Comprehension: Code Explore Challenge (JavaScript)

This document is the deliverable for the **Code Explore Challenge**. It explains what the
Task Manager JavaScript application does, how its pieces fit together, and how data flows
through it. The analysis is based on the starter code in
`use-cases/code-comprehension-001/javascript/TaskManager/`.

## 1. What the application is

A **command-line Task Manager** written in Node.js. It lets a user:

- create, list, update and delete tasks
- change a task's status, priority and due date
- add / remove tags
- view task statistics (totals, by status, by priority, overdue, completed-last-7-days)

Tasks are persisted to a JSON file (`tasks.json`) on disk.

## 2. Module map

| File | Responsibility | Key exports |
|------|----------------|-------------|
| `models.js` | Domain model + enums | `Task`, `TaskPriority`, `TaskStatus` |
| `storage.js` | Persistence (load/save JSON) | `TaskStorage` |
| `app.js` | Business logic / use-cases | `TaskManager` |
| `cli.js` | Command-line interface (entry point) | (runs on load) |

The dependency direction is: `cli.js` → `app.js` → `storage.js` → `models.js`.

```
            ┌─────────┐
  user ───▶ │ cli.js  │  (commander, argument parsing, formatting output)
            └────┬────┘
                 │ uses
                 ▼
            ┌─────────┐
            │ app.js  │  TaskManager: createTask, listTasks, updateTask*, stats…
            └────┬────┘
                 │ uses
                 ▼
           ┌──────────┐
           │storage.js│  TaskStorage: in-memory map <-> tasks.json
           └────┬─────┘
                │ uses
                ▼
           ┌──────────┐
           │models.js │  Task class + TaskPriority / TaskStatus enums
           └──────────┘
```

## 3. Data model (`models.js`)

- `TaskPriority` — enum `{ LOW:1, MEDIUM:2, HIGH:3, URGENT:4 }`.
- `TaskStatus` — enum `{ TODO:'todo', IN_PROGRESS:'in_progress', REVIEW:'review', DONE:'done' }`.
- `Task` — the central entity. Constructor assigns:
  - `id` via `uuid.v4()` (unique, random)
  - `title`, `description`, `priority` (default MEDIUM), `dueDate` (default null), `tags` (default `[]`)
  - `status` (default TODO), `createdAt`/`updatedAt` (now), `completedAt` (null)
- Behaviour on `Task`:
  - `update(updates)` — shallow-copies known own properties and bumps `updatedAt`.
  - `markAsDone()` — sets status DONE, records `completedAt`, syncs `updatedAt`.
  - `isOverdue()` — true when a `dueDate` exists, is in the past, and status ≠ DONE.

## 4. Persistence (`storage.js`)

`TaskStorage` wraps a `Map`-like object keyed by `task.id` (stored as a plain object
`this.tasks`). It loads the whole file into memory on construction and rewrites the
entire file on every mutation (`save()`).

- `load()` — reads `tasks.json`; for each record it reconstructs a `Task` and **restores
  dates** (`createdAt`, `updatedAt`, `dueDate`, `completedAt`) by re-parsing ISO strings.
- `save()` — `JSON.stringify(this.tasks values, null, 2)` to disk.
- Query helpers: `getAllTasks`, `getTasksByStatus`, `getTasksByPriority`, `getOverdueTasks`.
- Mutations: `addTask`, `updateTask`, `deleteTask` — each mutates the map then calls `save()`.

> Note (a comprehension observation, not a fix): the whole file is rewritten on every
> change, and there is no locking. This is simple but not efficient or safe under
> concurrent writers — relevant later in the performance/documentation exercises.

## 5. Business logic (`app.js`)

`TaskManager` is a thin façade over `TaskStorage` plus a few computations:

- `createTask(...)` — validates the date string, builds a `Task`, returns its id (or `null`
  on bad date).
- `listTasks(status, priority, overdue)` — branches: overdue → `getOverdueTasks()`;
  status filter → `getTasksByStatus`; priority filter → `getTasksByPriority`; else all.
- `updateTaskStatus` — special-cases DONE (calls `markAsDone()`) so `completedAt` is set;
  otherwise a generic field update.
- `updateTaskPriority` / `updateTaskDueDate` — generic update (due date re-validated).
- `addTagToTask` / `removeTagFromTask` — mutate the tags array then `save()`.
- `getStatistics()` — pure in-memory aggregation: counts by status & priority, overdue
  count, and "completed in last 7 days" (compares `completedAt` to `now - 7d`).

## 6. Entry point & control flow (`cli.js`)

`cli.js` is the **entry point** (`node cli.js`). It:

1. Builds a `commander` program with one sub-command per feature
   (`create`, `list`, `status`, `priority`, `due`, `tag`, `untag`, `show`, `delete`, `stats`).
2. On each command's `.action`, it calls the corresponding `TaskManager` method and prints
   a human-readable result using the local `formatTask()` helper (status/priority symbols,
   due date, tags, created timestamp).
3. Calls `program.parse(process.argv)`; if no args, prints help.

Typical flow for `node cli.js create "Buy milk" -p 3 -u 2023-12-31 -t shop`:

```
cli action → taskManager.createTask(...) → new Task(...)
           → storage.addTask(task) → tasks[id]=task → storage.save() → tasks.json written
           → cli prints "Created task with ID: <uuid>"
```

## 7. Things a reader should notice (questions this code invites)

- **Where is state?** In `storage.tasks` (in memory) mirrored to `tasks.json`.
- **Is it transactional?** No — partial failures between map mutation and `save()` can
  lose data.
- **Date handling** is string-based (`YYYY-MM-DD`) at the CLI but `Date` objects internally;
  `toISOString().split('T')[0]` is used to render dates back.
- **`update()` trusts property names** — only overwrites properties the object already has.
- **No input validation** beyond date parsing (e.g. priority strings, unknown statuses).

## 8. How to run

```bash
cd use-cases/code-comprehension-001/javascript/TaskManager
npm install
node cli.js create "My first task" -p 3
node cli.js list
node cli.js stats
npm test        # existing Jest suite
```
