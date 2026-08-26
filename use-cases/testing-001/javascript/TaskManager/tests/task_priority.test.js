// tests/task_priority.test.js
const { Task, TaskPriority, TaskStatus } = require('../models');
const { calculateTaskScore, sortTasksByImportance, getTopPriorityTasks } = require('../task_priority');

// Build a task with a fixed (old) updatedAt so the "recently updated" (+5) boost is
// deterministic and absent, letting us assert exact scores.
function makeTask({ priority, dueDate = null, status = TaskStatus.TODO, tags = [] }) {
  const t = new Task('t', '', priority, dueDate, tags);
  t.updatedAt = new Date('2020-01-01');
  t.status = status;
  return t;
}

describe('calculateTaskScore', () => {
  test('base score scales with priority', () => {
    expect(calculateTaskScore(makeTask({ priority: TaskPriority.LOW }))).toBe(10);
    expect(calculateTaskScore(makeTask({ priority: TaskPriority.URGENT }))).toBe(40);
  });

  test('overdue task gets a boost', () => {
    const overdue = makeTask({ priority: TaskPriority.URGENT, dueDate: new Date('2000-01-01') });
    expect(calculateTaskScore(overdue)).toBe(70); // 40 + 30
  });

  test('blocker tag adds a boost', () => {
    const t = makeTask({ priority: TaskPriority.URGENT, dueDate: new Date('2000-01-01'), tags: ['blocker'] });
    expect(calculateTaskScore(t)).toBe(78); // 40 + 30 + 8
  });

  test('completed status reduces score', () => {
    const t = makeTask({ priority: TaskPriority.URGENT, dueDate: new Date('2000-01-01'), status: TaskStatus.DONE, tags: ['blocker'] });
    expect(calculateTaskScore(t)).toBe(28); // 40 + 30 + 8 - 50
  });

  test('review status reduces score', () => {
    const t = makeTask({ priority: TaskPriority.URGENT, status: TaskStatus.REVIEW });
    expect(calculateTaskScore(t)).toBe(25); // 40 - 15
  });
});

describe('sortTasksByImportance', () => {
  test('returns a new array sorted by score descending', () => {
    const low = makeTask({ priority: TaskPriority.LOW });
    const urgent = makeTask({ priority: TaskPriority.URGENT, dueDate: new Date('2000-01-01') });
    const input = [low, urgent];
    const sorted = sortTasksByImportance(input);
    expect(sorted[0]).toBe(urgent);
    expect(sorted[1]).toBe(low);
    expect(input).toEqual([low, urgent]); // original not mutated
  });
});

describe('getTopPriorityTasks', () => {
  test('returns only the top N tasks', () => {
    const tasks = [
      makeTask({ priority: TaskPriority.LOW }),
      makeTask({ priority: TaskPriority.MEDIUM }),
      makeTask({ priority: TaskPriority.HIGH }),
      makeTask({ priority: TaskPriority.URGENT, dueDate: new Date('2000-01-01') }),
    ];
    const top = getTopPriorityTasks(tasks, 2);
    expect(top.length).toBe(2);
    expect(top[0].priority).toBe(TaskPriority.URGENT);
  });
});
