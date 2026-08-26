// tests/task_priority_exercise.test.js
// Exercises from "Using AI to help with testing" (testing-001, JavaScript Task Manager).
// The module under test is ../task_priority (calculateTaskScore with optional currentUser,
// sortTasksByImportance, getTopPriorityTasks).
const { Task, TaskPriority, TaskStatus } = require('../models');
const { calculateTaskScore, sortTasksByImportance, getTopPriorityTasks } = require('../task_priority');

const DAY = 1000 * 60 * 60 * 24;
const nowMinus = (days) => new Date(Date.now() - days * DAY);
const nowPlus = (days) => new Date(Date.now() + days * DAY);

// Build a Task with explicit, deterministic fields for assertions.
function mk({ priority, dueDate = null, status = TaskStatus.TODO, tags = [], assignee, updatedAt = new Date('2020-01-01') }) {
  const t = new Task('t', '', priority, dueDate, tags);
  t.status = status;
  if (assignee !== undefined) t.assignee = assignee;
  t.updatedAt = updatedAt;
  return t;
}

// ---------------------------------------------------------------------------
// PART 1.1 — Behavior Analysis: the >=5 test cases we identified
// ---------------------------------------------------------------------------
describe('Part 1.1 — calculateTaskScore behaviors', () => {
  test('base score scales with priority weight * 10', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.LOW }))).toBe(10);
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT }))).toBe(40);
  });

  test('unknown priority yields base 0 (no crash)', () => {
    expect(calculateTaskScore(mk({ priority: 'nonsense' }))).toBe(0);
  });

  test('overdue task gets +30', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT, dueDate: nowMinus(2) }))).toBe(70); // 40 + 30
  });

  test('due within 2 days gets +15', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.MEDIUM, dueDate: nowPlus(1) }))).toBe(35); // 20 + 15
  });

  test('due within a week gets +10', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.MEDIUM, dueDate: nowPlus(5) }))).toBe(30); // 20 + 10
  });

  test('due far in the future gets no due-date boost', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.MEDIUM, dueDate: nowPlus(12) }))).toBe(20);
  });

  test('due-today (0 days) gets +20', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.MEDIUM, dueDate: nowMinus(0.5) }))).toBe(40); // 20 + 20
  });

  test('blocker/critical/urgent tag adds +8', () => {
    const t = mk({ priority: TaskPriority.URGENT, dueDate: nowMinus(2), tags: ['critical'] });
    expect(calculateTaskScore(t)).toBe(78); // 40 + 30 + 8
  });

  test('DONE status reduces score by 50', () => {
    const t = mk({ priority: TaskPriority.URGENT, dueDate: nowMinus(2), status: TaskStatus.DONE, tags: ['blocker'] });
    expect(calculateTaskScore(t)).toBe(28); // 40 + 30 + 8 - 50
  });

  test('REVIEW status reduces score by 15', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT, status: TaskStatus.REVIEW }))).toBe(25); // 40 - 15
  });
});

// ---------------------------------------------------------------------------
// PART 2.1 — Writing Your First Test (basic) then Improving it
// ---------------------------------------------------------------------------
describe('Part 2.1 — first (basic) test vs improved test', () => {
  // BASIC: only checks the happy path, single assertion, weak intent.
  test('BASIC: an urgent task returns a higher score than a low task', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT })))
      .toBeGreaterThan(calculateTaskScore(mk({ priority: TaskPriority.LOW })));
  });

  // IMPROVED: asserts exact composition, names the behavior, covers the
  // recently-updated +5 boost, and is readable without comments.
  test('IMPROVED: score = priority*10 + recentlyUpdated(+5) for a plain TODO task', () => {
    const recent = mk({ priority: TaskPriority.HIGH, updatedAt: nowMinus(0.5) }); // 12h ago
    expect(calculateTaskScore(recent)).toBe(35); // 30 (HIGH) + 5 (updated <1d)
  });
});

// ---------------------------------------------------------------------------
// PART 2.2 — Comprehensive due-date calculation test
// ---------------------------------------------------------------------------
describe('Part 2.2 — due-date calculation', () => {
  // Principle: each band boundary must be tested because the formula uses ceil()
  // and exclusive/inclusive boundaries decide which boost applies.
  const cases = [
    { due: nowMinus(1), expected: 'overdue(+30)', score: 30 + 40 },
    { due: nowMinus(0), expected: 'due today(+20)', score: 20 + 40 },
    { due: nowPlus(1), expected: 'due<=2d(+15)', score: 15 + 40 },
    { due: nowPlus(2), expected: 'due<=2d(+15)', score: 15 + 40 },
    { due: nowPlus(7), expected: 'due<=7d(+10)', score: 10 + 40 },
    { due: nowPlus(8), expected: 'no boost', score: 40 },
  ];
  test.each(cases)('URGENT task $expected', ({ due, score }) => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT, dueDate: due }))).toBe(score);
  });

  test('tasks without a due date receive no due-date boost', () => {
    expect(calculateTaskScore(mk({ priority: TaskPriority.URGENT }))).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// PART 3.1 — TDD for new feature: +12 for tasks assigned to current user
// ---------------------------------------------------------------------------
describe('Part 3.1 — TDD: current-user boost (+12)', () => {
  test('RED->GREEN: task assigned to current user gets +12', () => {
    const t = mk({ priority: TaskPriority.MEDIUM, assignee: 'alice' });
    expect(calculateTaskScore(t, 'alice')).toBe(32); // 20 + 12
  });

  test('no boost when assignee differs from current user', () => {
    const t = mk({ priority: TaskPriority.MEDIUM, assignee: 'bob' });
    expect(calculateTaskScore(t, 'alice')).toBe(20);
  });

  test('no boost when no current user is supplied (backward compatible)', () => {
    const t = mk({ priority: TaskPriority.MEDIUM, assignee: 'alice' });
    expect(calculateTaskScore(t)).toBe(20);
  });

  test('boost stacks with overdue + tag', () => {
    const t = mk({ priority: TaskPriority.URGENT, dueDate: nowMinus(2), tags: ['blocker'], assignee: 'alice' });
    expect(calculateTaskScore(t, 'alice')).toBe(90); // 40 + 30 + 8 + 12
  });
});

// ---------------------------------------------------------------------------
// PART 3.2 — TDD for bug fix: "days since update" must be in DAYS, not ms/1000
// The buggy variant `Math.floor((now - updatedAt) / 1000)` turns 12h into
// 43200 "days", so the <1-day recently-updated boost would never apply.
// This test fails on the buggy code and passes on the fixed code.
// ---------------------------------------------------------------------------
describe('Part 3.2 — TDD: days-since-update regression guard', () => {
  test('a task updated ~12h ago earns the recently-updated +5 boost', () => {
    const t = mk({ priority: TaskPriority.MEDIUM, updatedAt: nowMinus(0.5) }); // 12h ago
    expect(calculateTaskScore(t)).toBe(25); // 20 + 5
  });
});

// ---------------------------------------------------------------------------
// PART 4.1 — Integration: score -> sort -> top-N all work together
// ---------------------------------------------------------------------------
describe('Part 4.1 — integration: full prioritisation workflow', () => {
  const tasks = [
    mk({ priority: TaskPriority.LOW, assignee: 'alice' }),                                    // 10 + 12 = 22
    mk({ priority: TaskPriority.URGENT, dueDate: nowMinus(2), tags: ['blocker'], assignee: 'alice' }), // 40+30+8+12 = 90
    mk({ priority: TaskPriority.MEDIUM, status: TaskStatus.DONE }),                            // 20 - 50 = -30
    mk({ priority: TaskPriority.HIGH, dueDate: nowPlus(1), assignee: 'bob' }),                 // 30 + 15 = 45
  ];

  test('sortTasksByImportance returns a new array, highest score first, input untouched', () => {
    const inputCopy = [...tasks];
    const sorted = sortTasksByImportance(tasks);
    expect(sorted.map(t => calculateTaskScore(t, 'alice'))).toEqual([90, 45, 22, -30]);
    expect(tasks).toEqual(inputCopy); // not mutated
  });

  test('getTopPriorityTasks returns the top N by score', () => {
    const top = getTopPriorityTasks(tasks, 2, 'alice');
    expect(top.length).toBe(2);
    expect(calculateTaskScore(top[0], 'alice')).toBe(90);
    expect(calculateTaskScore(top[1], 'alice')).toBe(45);
  });

  test('getTopPriorityTasks honours the current user for ranking', () => {
    // As "bob", the HIGH due-soon task (45) outranks alice's LOW task (22),
    // but alice's assigned URGENT task (90) still leads.
    const top = getTopPriorityTasks(tasks, 3, 'bob');
    expect(calculateTaskScore(top[0], 'bob')).toBe(78); // alice's URGENT overdue+blocker, no bob boost
    // NOTE (finding): sortTasksByImportance/getTopPriorityTasks call calculateTaskScore
    // WITHOUT currentUser, so ranking is by base score; re-scoring for bob promotes his own
    // assigned task (HIGH due-soon +12) to 57. See Discussion/reflection.
    expect(calculateTaskScore(top[1], 'bob')).toBe(57); // bob's own assigned HIGH due-soon task (+12)
  });
});
