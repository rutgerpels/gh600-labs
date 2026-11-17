'use strict';

const VALID_STATUSES = ['todo', 'in-progress', 'done'];

function createStore() {
  const tasks = new Map();
  let nextId = 1;

  return {
    add(title) {
      if (typeof title !== 'string' || title.trim() === '') {
        throw new Error('title is required');
      }
      const task = { id: nextId++, title: title.trim(), status: 'todo' };
      tasks.set(task.id, task);
      return task;
    },

    get(id) {
      return tasks.get(id) ?? null;
    },

    list(status) {
      return [...tasks.values()];
    },

    setStatus(id, status) {
      if (!VALID_STATUSES.includes(status)) {
        throw new Error(`invalid status: ${status}`);
      }
      const task = tasks.get(id);
      if (!task) {
        throw new Error(`task ${id} not found`);
      }
      task.status = status;
      return task;
    },

    remove(id) {
      return tasks.delete(id);
    },
  };
}

module.exports = { createStore, VALID_STATUSES };
