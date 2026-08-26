// tests/task_list_merge.test.js
const { mergeTaskLists } = require('../task_list_merge');

describe('mergeTaskLists', () => {
  test('task present only locally -> create remote', () => {
    const local = { a: { id: 'a', title: 'L', updatedAt: '2023-01-01', status: 'todo', tags: [] } };
    const res = mergeTaskLists(local, {});
    expect(res.mergedTasks.a).toBeDefined();
    expect(res.toCreateRemote.a).toBeDefined();
    expect(res.toCreateLocal).toEqual({});
  });

  test('task present only remotely -> create local', () => {
    const remote = { b: { id: 'b', title: 'R', updatedAt: '2023-01-01', status: 'todo', tags: [] } };
    const res = mergeTaskLists({}, remote);
    expect(res.toCreateLocal.b).toBeDefined();
    expect(res.toCreateRemote).toEqual({});
  });

  test('newer remote wins for scalar fields', () => {
    // Identical tags so only the scalar-field (title) conflict is exercised.
    const local = { a: { id: 'a', title: 'L', updatedAt: '2023-01-01', status: 'todo', tags: ['x'] } };
    const remote = { a: { id: 'a', title: 'R', updatedAt: '2023-02-01', status: 'todo', tags: ['x'] } };
    const res = mergeTaskLists(local, remote);
    expect(res.mergedTasks.a.title).toBe('R');
    expect(res.toUpdateLocal.a).toBeDefined();
    expect(res.toUpdateRemote).toEqual({});
  });

  test('completed status takes precedence over non-completed', () => {
    const local = { a: { id: 'a', title: 'L', updatedAt: '2023-03-01', status: 'todo', tags: [] } };
    const remote = { a: { id: 'a', title: 'R', updatedAt: '2023-02-01', status: 'done', completedAt: '2023-02-01', tags: [] } };
    const res = mergeTaskLists(local, remote);
    expect(res.mergedTasks.a.status).toBe('done');
    expect(res.toUpdateLocal.a).toBeDefined();
  });

  test('tags are merged as a union', () => {
    const local = { a: { id: 'a', title: 'L', updatedAt: '2023-01-01', status: 'todo', tags: ['x'] } };
    const remote = { a: { id: 'a', title: 'R', updatedAt: '2023-02-01', status: 'todo', tags: ['y'] } };
    const res = mergeTaskLists(local, remote);
    expect(res.mergedTasks.a.tags.sort()).toEqual(['x', 'y']);
  });
});
