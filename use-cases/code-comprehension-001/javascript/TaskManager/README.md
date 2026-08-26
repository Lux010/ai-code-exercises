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
3. Add/update tests for any behaviour change.
4. Open a pull request describing the change.

## License

MIT License.
