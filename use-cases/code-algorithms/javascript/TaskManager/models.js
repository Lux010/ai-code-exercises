// models.js
const { v4: uuidv4 } = require('uuid');

/** Numeric priority levels for a task (higher = more urgent). */
const TaskPriority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4
};

/** Lifecycle states a task can be in. */
const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done'
};

/**
 * Represents a single task in the Task Manager.
 */
class Task {
  constructor(title, description = '', priority = TaskPriority.MEDIUM, dueDate = null, tags = []) {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.status = TaskStatus.TODO;
    this.createdAt = new Date();
    this.updatedAt = this.createdAt;
    this.dueDate = dueDate;
    this.completedAt = null;
    this.tags = tags;
  }

  /**
   * Shallow-apply a set of field updates to this task and bump `updatedAt`.
   * Only properties the task already owns are copied.
   * @param {Object} updates - Partial task fields to merge in.
   */
  update(updates) {
    Object.keys(updates).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = updates[key];
      }
    });
    this.updatedAt = new Date();
  }

  /**
   * Mark the task as completed: sets status DONE and records `completedAt`.
   */
  markAsDone() {
    this.status = TaskStatus.DONE;
    this.completedAt = new Date();
    this.updatedAt = this.completedAt;
  }

  /**
   * @returns {boolean} True when a due date exists, is in the past, and the task is not DONE.
   */
  isOverdue() {
    if (!this.dueDate) {
      return false;
    }
    return this.dueDate < new Date() && this.status !== TaskStatus.DONE;
  }
}

module.exports = { Task, TaskPriority, TaskStatus };

