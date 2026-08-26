// tests/task.test.js
const { Task, TaskPriority, TaskStatus } = require('../models');

describe('Task', () => {
  describe('constructor', () => {
    test('creates a task with sensible defaults', () => {
      const task = new Task('Test Task');
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.tags).toEqual([]);
    });

    test('creates a task with all fields', () => {
      const dueDate = new Date('2023-12-31');
      const tags = ['test', 'important'];
      const task = new Task('T', 'D', TaskPriority.HIGH, dueDate, tags);
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.dueDate).toBe(dueDate);
      expect(task.tags).toEqual(tags);
    });
  });

  describe('update', () => {
    test('updates known properties and bumps updatedAt', () => {
      const task = new Task('Original');
      task.update({ title: 'Updated', status: TaskStatus.IN_PROGRESS });
      expect(task.title).toBe('Updated');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    test('ignores non-existent properties', () => {
      const task = new Task('Test');
      task.update({ notARealField: 'x' });
      expect(task).not.toHaveProperty('notARealField');
    });
  });

  describe('markAsDone', () => {
    test('sets status DONE and records completedAt', () => {
      const task = new Task('Test');
      task.markAsDone();
      expect(task.status).toBe(TaskStatus.DONE);
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toEqual(task.completedAt);
    });
  });

  describe('isOverdue', () => {
    test('false when no due date', () => {
      expect(new Task('T').isOverdue()).toBe(false);
    });

    test('false when due date is in the future', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(new Task('T', '', TaskPriority.MEDIUM, future).isOverdue()).toBe(false);
    });

    test('true when due date is in the past and not done', () => {
      const past = new Date('2000-01-01');
      expect(new Task('T', '', TaskPriority.MEDIUM, past).isOverdue()).toBe(true);
    });

    test('false when past due but already done', () => {
      const past = new Date('2000-01-01');
      const task = new Task('T', '', TaskPriority.MEDIUM, past);
      task.markAsDone();
      expect(task.isOverdue()).toBe(false);
    });
  });
});
