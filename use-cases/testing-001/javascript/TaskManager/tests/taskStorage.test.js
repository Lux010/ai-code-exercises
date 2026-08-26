// tests/taskStorage.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const { TaskStorage } = require('../storage');
const { Task, TaskStatus, TaskPriority } = require('../models');

const tmpFile = () => path.join(os.tmpdir(), `ts-test-${Date.now()}-${Math.random()}.json`);

describe('TaskStorage', () => {
  let file;

  beforeEach(() => { file = tmpFile(); });
  afterEach(() => { if (fs.existsSync(file)) fs.unlinkSync(file); });

  test('addTask then getAllTasks', () => {
    const storage = new TaskStorage(file);
    const t = new Task('A');
    storage.addTask(t);
    expect(storage.getAllTasks().length).toBe(1);
  });

  test('getTask, updateTask, deleteTask', () => {
    const storage = new TaskStorage(file);
    const t = new Task('A');
    storage.addTask(t);
    expect(storage.updateTask(t.id, { status: TaskStatus.IN_PROGRESS })).toBe(true);
    expect(storage.getTask(t.id).status).toBe(TaskStatus.IN_PROGRESS);
    expect(storage.deleteTask(t.id)).toBe(true);
    expect(storage.getTask(t.id)).toBeUndefined();
  });

  test('query helpers filter correctly', () => {
    const storage = new TaskStorage(file);
    const a = new Task('A', '', TaskPriority.HIGH);
    const b = new Task('B', '', TaskPriority.LOW);
    a.status = TaskStatus.DONE;
    storage.addTask(a);
    storage.addTask(b);
    expect(storage.getTasksByPriority(TaskPriority.HIGH).length).toBe(1);
    expect(storage.getTasksByStatus(TaskStatus.DONE).length).toBe(1);
  });

  test('persists across reloads (save/load round trip)', () => {
    const storage = new TaskStorage(file);
    const t = new Task('Persisted', 'd', TaskPriority.URGENT);
    storage.addTask(t);

    const reloaded = new TaskStorage(file);
    const got = reloaded.getTask(t.id);
    expect(got.title).toBe('Persisted');
    expect(got.priority).toBe(TaskPriority.URGENT);
    expect(got.dueDate).toBeNull();
  });

  test('restores dates from disk', () => {
    const storage = new TaskStorage(file);
    const t = new Task('Dated', '', TaskPriority.MEDIUM, new Date('2025-06-15'));
    storage.addTask(t);
    const reloaded = new TaskStorage(file);
    expect(reloaded.getTask(t.id).dueDate).toBeInstanceOf(Date);
    expect(reloaded.getTask(t.id).dueDate.toISOString().slice(0, 10)).toBe('2025-06-15');
  });
});
