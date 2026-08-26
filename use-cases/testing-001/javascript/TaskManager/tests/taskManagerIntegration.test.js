// tests/taskManagerIntegration.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { TaskManager } = require('../app');
const { TaskStatus } = require('../models');

const tmpFile = () => path.join(os.tmpdir(), `tmi-test-${Date.now()}-${Math.random()}.json`);

describe('TaskManager integration', () => {
  let manager;
  let file;

  beforeEach(() => {
    file = tmpFile();
    manager = new TaskManager(file);
  });
  afterEach(() => { if (fs.existsSync(file)) fs.unlinkSync(file); });

  test('full lifecycle: create -> update -> complete -> stats', () => {
    const id = manager.createTask('Ship feature', 'desc', 4, '2030-01-01', ['launch']);
    expect(id).toBeDefined();

    manager.updateTaskPriority(id, 3);
    manager.addTagToTask(id, 'urgent');
    manager.updateTaskStatus(id, TaskStatus.DONE);

    const task = manager.getTaskDetails(id);
    expect(task.priority).toBe(3);
    expect(task.tags).toEqual(expect.arrayContaining(['launch', 'urgent']));
    expect(task.status).toBe(TaskStatus.DONE);

    const stats = manager.getStatistics();
    expect(stats.total).toBe(1);
    expect(stats.byStatus[TaskStatus.DONE]).toBe(1);
    expect(stats.completedLastWeek).toBe(1);
  });

  test('data survives a reload (new manager instance, same file)', () => {
    const id = manager.createTask('Persistent');
    manager.updateTaskStatus(id, TaskStatus.IN_PROGRESS);

    const reloaded = new TaskManager(file);
    const task = reloaded.getTaskDetails(id);
    expect(task).toBeDefined();
    expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    expect(reloaded.listTasks().length).toBe(1);
  });

  test('overdue filter works end-to-end', () => {
    // Due date in the past, not done -> overdue.
    manager.createTask('Late', '', 2, '2000-01-01');
    expect(manager.listTasks(null, null, true).length).toBe(1);
  });
});
