// tests/taskManager.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { TaskManager } = require('../app');
const { TaskStatus, TaskPriority } = require('../models');

const tmpFile = () => path.join(os.tmpdir(), `tm-test-${Date.now()}-${Math.random()}.json`);

describe('TaskManager', () => {
  let manager;
  let file;

  beforeEach(() => {
    file = tmpFile();
    manager = new TaskManager(file);
  });

  afterEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  test('createTask returns an id and persists', () => {
    const id = manager.createTask('Write report', 'desc', 3, '2030-01-01', ['work']);
    expect(id).toBeDefined();
    const task = manager.getTaskDetails(id);
    expect(task.title).toBe('Write report');
    expect(task.priority).toBe(TaskPriority.HIGH);
    expect(task.tags).toEqual(['work']);
  });

  test('createTask returns null for an invalid date', () => {
    const id = manager.createTask('Bad', '', 2, 'not-a-date');
    expect(id).toBeNull();
  });

  test('listTasks returns all tasks by default', () => {
    manager.createTask('A');
    manager.createTask('B');
    expect(manager.listTasks().length).toBe(2);
  });

  test('listTasks filters by status and priority', () => {
    manager.createTask('A', '', 3);
    manager.createTask('B', '', 2);
    expect(manager.listTasks(null, 3).length).toBe(1);
  });

  test('updateTaskStatus to DONE records completedAt', () => {
    const id = manager.createTask('A');
    const ok = manager.updateTaskStatus(id, TaskStatus.DONE);
    expect(ok).toBe(true);
    expect(manager.getTaskDetails(id).completedAt).toBeInstanceOf(Date);
  });

  test('updateTaskPriority changes priority', () => {
    const id = manager.createTask('A', '', 2);
    manager.updateTaskPriority(id, 4);
    expect(manager.getTaskDetails(id).priority).toBe(TaskPriority.URGENT);
  });

  test('updateTaskDueDate validates the date', () => {
    const id = manager.createTask('A');
    expect(manager.updateTaskDueDate(id, 'bad')).toBe(false);
    const ok = manager.updateTaskDueDate(id, '2030-05-05');
    expect(ok).toBe(true);
    expect(manager.getTaskDetails(id).dueDate).toBeInstanceOf(Date);
  });

  test('add and remove tags', () => {
    const id = manager.createTask('A');
    manager.addTagToTask(id, 'x');
    expect(manager.getTaskDetails(id).tags).toContain('x');
    manager.removeTagFromTask(id, 'x');
    expect(manager.getTaskDetails(id).tags).not.toContain('x');
  });

  test('deleteTask removes the task', () => {
    const id = manager.createTask('A');
    expect(manager.deleteTask(id)).toBe(true);
    expect(manager.getTaskDetails(id)).toBeUndefined();
  });

  test('getStatistics aggregates counts', () => {
    manager.createTask('A', '', 3);
    const id = manager.createTask('B', '', 2);
    manager.updateTaskStatus(id, TaskStatus.DONE);
    const stats = manager.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.byStatus[TaskStatus.DONE]).toBe(1);
    expect(stats.byPriority[TaskPriority.HIGH]).toBe(1);
    expect(stats.completedLastWeek).toBe(1);
  });
});
