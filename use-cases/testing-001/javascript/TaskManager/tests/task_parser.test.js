// tests/task_parser.test.js
const { parseTaskFromText } = require('../task_parser');
const { TaskPriority } = require('../models');

describe('parseTaskFromText', () => {
  test('parses plain title only', () => {
    const t = parseTaskFromText('Hello world');
    expect(t.title).toBe('Hello world');
    expect(t.priority).toBe(TaskPriority.MEDIUM);
    expect(t.tags).toEqual([]);
    expect(t.dueDate).toBeNull();
  });

  test('extracts tags', () => {
    const t = parseTaskFromText('Buy milk @shopping @urgent');
    expect(t.title).toBe('Buy milk');
    expect(t.tags).toEqual(['shopping', 'urgent']);
  });

  test('extracts numeric priority', () => {
    const t = parseTaskFromText('Task !3');
    expect(t.priority).toBe(TaskPriority.HIGH);
  });

  test('extracts named priority', () => {
    const t = parseTaskFromText('Task !urgent');
    expect(t.priority).toBe(TaskPriority.URGENT);
  });

  test('extracts a relative due date (#tomorrow)', () => {
    const before = new Date();
    before.setHours(0, 0, 0, 0);
    const t = parseTaskFromText('Task #tomorrow');
    const expected = new Date(before);
    expected.setDate(before.getDate() + 1);
    expect(t.dueDate.toDateString()).toBe(expected.toDateString());
  });

  test('extracts a YYYY-MM-DD due date', () => {
    const t = parseTaskFromText('Task #2025-12-25');
    // Compare local date parts (the parser builds a local-time Date, so avoid toISOString tz shift).
    expect(t.dueDate.getFullYear()).toBe(2025);
    expect(t.dueDate.getMonth()).toBe(11); // months are 0-based
    expect(t.dueDate.getDate()).toBe(25);
  });

  test('combines title, priority, tag and date', () => {
    const t = parseTaskFromText('Finish report !urgent #fri #work @project');
    expect(t.title).toBe('Finish report');
    expect(t.priority).toBe(TaskPriority.URGENT);
    expect(t.tags).toEqual(['project']);
    expect(t.dueDate).toBeInstanceOf(Date);
  });
});
