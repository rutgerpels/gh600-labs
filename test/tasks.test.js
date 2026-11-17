'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../src/tasks');

test('add creates a todo task with an incrementing id', () => {
  const store = createStore();
  const a = store.add('write lab guide');
  const b = store.add('review agent PR');
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(a.status, 'todo');
});

test('add rejects an empty title', () => {
  const store = createStore();
  assert.throws(() => store.add('   '), /title is required/);
});

test('setStatus updates a task', () => {
  const store = createStore();
  const t = store.add('ship it');
  assert.equal(store.setStatus(t.id, 'done').status, 'done');
});

test('setStatus rejects unknown statuses', () => {
  const store = createStore();
  const t = store.add('ship it');
  assert.throws(() => store.setStatus(t.id, 'blocked'), /invalid status/);
});

test('remove deletes a task', () => {
  const store = createStore();
  const t = store.add('temporary');
  assert.equal(store.remove(t.id), true);
  assert.equal(store.get(t.id), null);
});
