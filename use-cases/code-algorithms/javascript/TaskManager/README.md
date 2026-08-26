# Task Manager CLI (JavaScript)

A command-line interface for managing tasks with features for creating, updating, listing,
and analyzing tasks. This project is the starter code for the **Algorithm Deconstruction**,
**Knowing Where to Start**, **Code Documentation**, and **README Documentation** exercises.

## Prerequisites

- Node.js (v12 or higher recommended)
- npm (comes with Node.js)

## Installation

```bash
npm install
```

This installs: `commander` (CLI) and `uuid` (unique ids).

## Running the CLI

```bash
node cli.js [command] [options]
```

Running with no arguments prints the help menu.

## Project structure

| File | Responsibility |
|------|----------------|
| `models.js` | Domain model (`Task`) and enums `TaskPriority`, `TaskStatus` |
| `storage.js` | `TaskStorage` — loads/saves tasks to `tasks.json` and provides queries |
| `app.js` | `TaskManager` — business logic (create, list, update, statistics) |
| `cli.js` | `commander`-based entry point that wires commands to `TaskManager` |
| `task_list_merge.js` | Two-way sync merge of local & remote task lists (`mergeTaskLists`) |
| `task_parser.js` | Free-text → `Task` parser (`parseTaskFromText`) |
| `task_priority.js` | Importance scoring & ranking (`calculateTaskScore`, `sortTasksByImportance`) |
| `tests/` | Jest test suite per module |

Dependency direction: `cli.js → app.js → storage.js → models.js`. The `task_*.js`
algorithm modules are standalone utilities that `app.js` can call.

## Algorithms (high level)

- **Merge** (`task_list_merge.js`): union of two id-keyed task maps with last-writer-wins
  conflict resolution, completed-status precedence, and tag union; returns the merged set
  plus per-side create/update deltas.
- **Parse** (`task_parser.js`): extracts `@tags`, `!priority`, and `#dueDate` shorthands
  from free text into a `Task`.
- **Priority** (`task_priority.js`): additive heuristic score (priority weight + due-date
  proximity − completion + tag/recency boosts) used to rank tasks.

See `ALGORITHMS.md` for a full deconstruction and `WHERE-TO-START.md` for a change map.

## Available Commands

### Create a new task
```bash
node cli.js create "Complete project" -d "Finish the task manager project" -p 3 -u 2023-12-31 -t "work,coding,important"
```
Options: `-d,--description`, `-p,--priority` (1-4), `-u,--due` (YYYY-MM-DD), `-t,--tags`.

### List tasks
```bash
node cli.js list                 # all
node cli.js list -s todo        # by status (todo|in_progress|review|done)
node cli.js list -p 3           # by priority (1-4)
node cli.js list -o             # overdue only
```

### Update status / priority / due date
```bash
node cli.js status <task_id> in_progress
node cli.js priority <task_id> 3
node cli.js due <task_id> 2023-12-31
```

### Tags
```bash
node cli.js tag <task_id> important
node cli.js untag <task_id> important
```

### Show / delete / stats
```bash
node cli.js show <task_id>
node cli.js delete <task_id>
node cli.js stats
```
`stats` prints totals, counts by status & priority, overdue count, and tasks completed in
the last 7 days.

## Running Tests

```bash
npm test                                  # all tests
npx jest tests/task.test.js               # Task model
npx jest tests/taskManager.test.js        # TaskManager
npx jest tests/taskStorage.test.js        # TaskStorage
npx jest tests/taskManagerIntegration.test.js
npx jest tests/task_list_merge.test.js
npx jest tests/task_parser.test.js
npx jest tests/task_priority.test.js
npx jest --coverage                       # with coverage
```

## Data Storage

Tasks are stored in `tasks.json` in the project directory, created automatically on the
first task. The whole file is rewritten on every mutation (simple, but see `WHERE-TO-START.md`
for the trade-off).
