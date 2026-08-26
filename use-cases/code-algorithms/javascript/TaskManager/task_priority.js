const {TaskPriority, TaskStatus} = require("./models");

/**
 * Compute a heuristic importance score for a task.
 *
 * Higher = more important. Base = `priorityWeight * 10`. Adjustments:
 * due-date proximity (+10…+30, strongest when overdue), status penalty
 * (DONE −50, REVIEW −15), blocker/critical/urgent tag boost (+8), and a
 * recently-updated boost (+5).
 *
 * @param {object} task - A Task with `priority`, `dueDate`, `status`, `tags`, `updatedAt`.
 * @returns {number} The computed importance score.
 */
function calculateTaskScore(task) {
  // Base priority weights
  const priorityWeights = {
    [TaskPriority.LOW]: 1,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.HIGH]: 3,
    [TaskPriority.URGENT]: 4
  };

  // Calculate base score from priority
  let score = (priorityWeights[task.priority] || 0) * 10;

  // Add due date factor (higher score for tasks due sooner)
  if (task.dueDate) {
    const now = new Date();
    const dueDate =task.dueDate;
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {  // Overdue tasks
      score += 30;
    } else if (daysUntilDue === 0) {  // Due today
      score += 20;
    } else if (daysUntilDue <= 2) {  // Due in next 2 days
      score += 15;
    } else if (daysUntilDue <= 7) {  // Due in next week
      score += 10;
    }
  }

  // Reduce score for tasks that are completed or in review
  if (task.status === TaskStatus.DONE) {
    score -= 50;
  } else if (task.status === TaskStatus.REVIEW) {
    score -= 15;
  }

  // Boost score for tasks with certain tags
  if (task.tags.some(tag => ["blocker", "critical", "urgent"].includes(tag))) {
    score += 8;
  }

  // Boost score for recently updated tasks
  const now = new Date();
  const updatedAt = new Date(task.updatedAt);
  const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate < 1) {
    score += 5;
  }

  return score;
}

/**
 * Return a new array of tasks sorted by importance (highest score first).
 *
 * @param {object[]} tasks - Tasks to rank.
 * @returns {object[]} A new, sorted array (the input is not mutated).
 */
function sortTasksByImportance(tasks) {
  // Create a copy of the tasks array to avoid modifying the original
  return [...tasks].sort((a, b) => {
    return calculateTaskScore(b) - calculateTaskScore(a);
  });
}

/**
 * Return the `limit` most important tasks.
 *
 * @param {object[]} tasks - Tasks to rank.
 * @param {number} [limit=5] - Maximum number of tasks to return.
 * @returns {object[]} The top-ranked tasks (highest score first).
 */
function getTopPriorityTasks(tasks, limit = 5) {
  const sortedTasks = sortTasksByImportance(tasks);
  return sortedTasks.slice(0, limit);
}

// Export functions for testing
module.exports = { calculateTaskScore, sortTasksByImportance, getTopPriorityTasks };
