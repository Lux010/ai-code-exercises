# Exercise — README & User Guide Documentation (Task Manager, JavaScript)

**Project chosen:** the Task Manager CLI (JavaScript) — the same system used in the Code
Comprehension exercise (`use-cases/code-comprehension-001/javascript/TaskManager/`).

---

## A. Project information

- **Name:** Task Manager CLI
- **Description:** A command-line application for creating, updating, listing, and analyzing
  tasks, with priorities, due dates, tags, statuses, and statistics.
- **Key features:** create / update / delete tasks; priorities (1–4); due dates (`YYYY-MM-DD`);
  tags; statuses (`todo`, `in_progress`, `review`, `done`); statistics; JSON-file persistence;
  pluggable algorithm modules (merge, text parser, priority scoring).
- **Technologies:** Node.js, `commander` (CLI), `uuid` (ids). Storage is a local `tasks.json`
  file (no database).
- **Structure:**
  - `cli.js` — entry point / command definitions
  - `app.js` — `TaskManager` business logic
  - `models.js` — `Task` model + `TaskPriority`/`TaskStatus` enums
  - `storage.js` — `TaskStorage` (load/save JSON)
  - `task_list_merge.js`, `task_parser.js`, `task_priority.js` — algorithm modules
  - `tests/` — Jest suites

---

## B. Prompt 1 output — Comprehensive README

> **Prompt used:** "Create a comprehensive README.md for the Task Manager CLI (Node.js,
> commander). Include title/description, install, usage, features, config, troubleshooting,
> contributing, license. Use the **actual commands** from `cli.js`: `create`, `list`,
> `status`, `priority`, `due`, `tag`, `untag`, `show`, `delete`, `stats`."

# Task Manager CLI

A command-line task manager for developers: create, track, prioritize, and analyze tasks
without leaving the terminal. Tasks are stored locally in a `tasks.json` file.

## Features

- **Task lifecycle:** create, update status, set priority/due date, add/remove tags, delete.
- **Priorities:** `1` LOW, `2` MEDIUM (default), `3` HIGH, `4` URGENT.
- **Statuses:** `todo`, `in_progress`, `review`, `done`.
- **Tags** for cross-cutting organization.
- **Statistics:** totals, by-status, by-priority, overdue count, completed-in-last-7-days.
- **Local persistence** in `tasks.json` — no server or database required.
- **Algorithm modules:** two-way list merge, free-text parser, importance scoring.

## Installation

### Prerequisites
- Node.js v12+ and npm.

### Install & run
```bash
cd use-cases/code-comprehension-001/javascript/TaskManager
npm install
node cli.js --help
```

## Usage

```bash
# Create a task (with priority, due date, tags)
node cli.js create "Finish report" -p 3 -u 2023-12-31 -t "work,report"

# List tasks (all / by status / by priority / overdue only)
node cli.js list
node cli.js list -s in_progress
node cli.js list -p 4
node cli.js list -o

# Update status / priority / due date
node cli.js status <task_id> done
node cli.js priority <task_id> 2
node cli.js due <task_id> 2023-12-31

# Tags
node cli.js tag <task_id> urgent
node cli.js untag <task_id> urgent

# Inspect / delete / stats
node cli.js show <task_id>
node cli.js delete <task_id>
node cli.js stats
```

## Configuration

There is no external configuration file. Behaviour is controlled by CLI flags:
`-d/--description`, `-p/--priority` (1–4), `-u/--due` (`YYYY-MM-DD`), `-t/--tags`
(comma-separated). Tasks are persisted to `tasks.json` in the current working directory
(created automatically on first task).

## Troubleshooting

- **`command not found` / `node: command not found`** — ensure Node.js is installed and on
  your PATH (`node --version`).
- **"Invalid date format. Use YYYY-MM-DD"** — the `-u`/`due` value must be `YYYY-MM-DD`
  (e.g. `2023-12-31`); other formats are rejected.
- **"Task not found" / "Failed to update task status"** — you passed a wrong or truncated
  task id. Use `node cli.js list` or `node cli.js show <id>` to copy the correct id.
- **`tasks.json` seems wrong / empty** — the whole file is rewritten on every change; if a
  write was interrupted you may have a partial file. Restore from backup or delete it to
  start fresh (this loses tasks).
- **Tests fail / act on real data** — tests use a temp `tasks.json` path; run `npm test` from
  the project directory and don't run the CLI with the same cwd the tests use.

## Contributing

1. Fork the repository and create a feature branch.
2. `npm install` and `npm test` before committing.
3. Add/udpate tests for any behaviour change.
4. Open a pull request describing the change.

## License

MIT License.

---

## C. Prompt 2 output — Step-by-step guide

> **Prompt used:** "Create a step-by-step guide for: *Create a task, set its priority and due
> date, tag it, and mark it complete* in the Task Manager CLI. Beginner audience. Include
> prerequisites, numbered steps, code blocks, common mistakes, and a troubleshooting section."

# How to Create and Complete a Task

## Prerequisites
- Node.js v12+ installed.
- The Task Manager project installed (`npm install` in the project folder).

## Steps

1. **Open a terminal** in the project folder.
2. **Create a task** with a title, priority, due date, and tags:
   ```bash
   node cli.js create "Submit expense report" -p 3 -u 2023-12-31 -t "finance,urgent"
   ```
   Copy the printed task ID — you'll need it for later steps.
3. **Confirm it was created:**
   ```bash
   node cli.js list
   ```
4. **Adjust priority if needed:**
   ```bash
   node cli.js priority <task_id> 4
   ```
5. **Add another tag:**
   ```bash
   node cli.js tag <task_id> endofmonth
   ```
6. **Mark it complete:**
   ```bash
   node cli.js status <task_id> done
   ```
7. **Verify completion in statistics:**
   ```bash
   node cli.js stats
   ```
   The task now counts under `done` and in "Completed in last 7 days".

## Common mistakes
- Using a priority outside `1–4` → it is stored as-is but won't match the expected levels;
  stick to `1`–`4` (or names `low`/`medium`/`high`/`urgent` via the text parser).
- Wrong due-date format → must be `YYYY-MM-DD`.
- Forgetting the task ID → always copy it from the `create` output.

## Troubleshooting
- **"Invalid date format"** → re-run `due`/`create` with `YYYY-MM-DD`.
- **"Task not found"** → list tasks and copy the exact id; ids are UUIDs.
- **Completion not reflected in stats** → ensure you used `status <id> done`, not a custom
  status string.

---

## D. Prompt 3 output — FAQ

> **Prompt used:** "Create an FAQ for the Task Manager CLI. Include getting started, common
> features, and troubleshooting. Use the real `node cli.js …` commands."

# Task Manager CLI — FAQ

## Getting Started
**Q: How do I install it?**
```bash
cd use-cases/code-comprehension-001/javascript/TaskManager
npm install
node cli.js --help
```

**Q: What are the requirements?**
Node.js v12+ and npm. No database needed.

**Q: Where are tasks stored?**
In `tasks.json` in the directory where you run `node cli.js`.

## Basic Usage
**Q: How do I create a task?**
```bash
node cli.js create "My task" -p 2 -t "work"
```

**Q: How do I see all tasks?**
```bash
node cli.js list
```

**Q: How do I mark a task done?**
```bash
node cli.js status <task_id> done
```

**Q: Can I filter tasks?**
Yes: `node cli.js list -s in_progress`, `-p 4` (priority), or `-o` (overdue only).

## Features
**Q: What do the priority numbers mean?**
`1` LOW, `2` MEDIUM, `3` HIGH, `4` URGENT.

**Q: How do tags work?**
Add with `node cli.js tag <id> urgent`; remove with `untag`. They're free-form labels for
filtering/grouping.

**Q: What does `stats` show?**
Total tasks, counts by status and by priority, number overdue, and tasks completed in the
last 7 days.

## Troubleshooting
**Q: I get "Invalid date format. Use YYYY-MM-DD".**
Pass the due date as `YYYY-MM-DD`, e.g. `2023-12-31`.

**Q: "Task not found" when I update.**
You used a wrong/truncated id. Run `node cli.js list` and copy the exact UUID.

**Q: My `tasks.json` looks corrupted.**
The file is fully rewritten on each change; restore from a backup or delete it to reset
(loses tasks).

---

## E. Reflections

**Most challenging aspects to document**
- Keeping the docs **honest about the real CLI** — the example outputs in the brief use a
  different tool (`taskcli add …`, SQLite). I had to deliberately use the actual
  `node cli.js create/list/status …` commands and the JSON-file storage, not copy the
  example verbatim.
- The algorithm modules (`task_list_merge`, `task_parser`, `task_priority`) exist in code but
  are **not exposed as CLI commands**, so documenting "features" required care not to imply
  user-facing commands that don't exist.

**Prompt adjustments for better results**
- Explicitly pasted the real command list from `cli.js` into the prompt so the AI didn't
  invent `taskcli`-style commands.
- Told the AI "no external config file; storage is a local JSON file" to prevent fabricated
  `config set` commands.
- Asked for a beginner-level guide with the exact `create → priority → tag → status done`
  flow to keep it concrete.

**What I learned about structure/organization**
- A good README follows a predictable order: what it is → install → usage → config →
  troubleshooting → contributing → license. Readers scan, so consistent headings matter.
- Step-by-step guides should be task-centric (one job, start to finish) with a troubleshooting
  tail; FAQs should mirror real commands users actually run.

**How I'd use this in my workflow**
- Generate a README/FAQ draft from the code at project kickoff, then keep the OpenAPI/README
  as the single source of truth and regenerate on significant change.
- Always inject the *actual* command/API surface into the prompt and review the output
  against the code — the biggest risk (as in earlier exercises) is docs that describe a
  slightly different product than the one shipped.
