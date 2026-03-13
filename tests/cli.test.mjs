import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/index.mjs';
import { createBufferStream } from './helpers/io.mjs';

function baseEnv(overrides = {}) {
  return {
    CLICKUP_API_TOKEN: 'pk_test',
    CLICKUP_WORKSPACE_ID: 'workspace-1',
    ...overrides,
  };
}

test('runCli prints help without requiring configuration', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['--help'],
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Usage: clickup <command> \[options\]/);
  assert.equal(stderr.toString(), '');
});

test('runCli creates tasks using the default list id', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const calls = [];

  const exitCode = await runCli({
    argv: ['create', 'Quick task', '--assignee', 'me'],
    env: baseEnv({
      CLICKUP_DEFAULT_LIST_ID: 'list-123',
    }),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });

      if (url.endsWith('/api/v2/user')) {
        return new Response(JSON.stringify({
          user: {
            id: 'user-1',
            username: 'jane',
            email: 'jane@example.com',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.endsWith('/api/v2/list/list-123/task')) {
        const body = JSON.parse(options.body);
        assert.equal(body.name, 'Quick task');
        assert.deepEqual(body.assignees, ['user-1']);

        return new Response(JSON.stringify({
          id: 'task-1',
          name: 'Quick task',
          assignees: [{ username: 'jane' }],
          url: 'https://app.clickup.com/t/task-1',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Task created: Quick task/);
  assert.equal(stderr.toString(), '');
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      'https://api.clickup.com/api/v2/user',
      'https://api.clickup.com/api/v2/list/list-123/task',
    ]
  );
});

test('runCli returns command usage errors cleanly', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['edit-page', 'doc-1', 'page-1'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.toString(), '');
  assert.match(stderr.toString(), /At least --content, --name, or --sub-title is required/);
  assert.match(stderr.toString(), /Usage: clickup edit-page <doc_id> <page_id>/);
});

test('runCli rejects extra positional arguments cleanly', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['get', 'task-1', '--wat'],
    stdout,
    stderr,
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.toString(), '');
  assert.match(stderr.toString(), /Too many arguments/);
});

test('runCli allows dash-prefixed comment text as a positional argument', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['comment', 'task-1', '- first line'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      assert.equal(url, 'https://api.clickup.com/api/v2/task/task-1/comment');
      const body = JSON.parse(options.body);
      assert.ok(Array.isArray(body.comment));
      return new Response(JSON.stringify({ id: 'comment-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Comment posted successfully/);
  assert.equal(stderr.toString(), '');
});

test('runCli prints my tasks as json when a task priority is null', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['my-tasks', '--json'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname === '/api/v2/user') {
        return new Response(JSON.stringify({
          user: {
            id: 'user-1',
            username: 'jane',
            email: 'jane@example.com',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (parsedUrl.pathname === '/api/v2/team/workspace-1/task') {
        assert.equal(parsedUrl.searchParams.get('subtasks'), 'true');
        assert.deepEqual(parsedUrl.searchParams.getAll('assignees[]'), ['user-1']);

        return new Response(JSON.stringify({
          tasks: [
            {
              id: 'task-1',
              name: 'Null priority task',
              priority: null,
              status: { status: 'to do' },
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr.toString(), '');
  assert.deepEqual(JSON.parse(stdout.toString()), [
    {
      id: 'task-1',
      name: 'Null priority task',
      priority: null,
      status: { status: 'to do' },
    },
  ]);
});

test('runCli forwards documented page query and body options', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const calls = [];

  const exitCode = await runCli({
    argv: [
      'create-page',
      'doc-1',
      'Overview',
      '--content',
      '# Hello',
      '--sub-title',
      'Subheading',
      '--parent-page-id',
      'page-0',
      '--content-format',
      'text/plain',
    ],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      assert.equal(url, 'https://api.clickup.com/api/v3/workspaces/workspace-1/docs/doc-1/pages');
      assert.deepEqual(JSON.parse(options.body), {
        name: 'Overview',
        content: '# Hello',
        content_format: 'text/plain',
        parent_page_id: 'page-0',
        sub_title: 'Subheading',
      });

      return new Response(JSON.stringify({ id: 'page-1', name: 'Overview' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Page created: Overview/);
  assert.equal(stderr.toString(), '');
  assert.equal(calls.length, 1);
});

test('runCli allows editing a page subtitle and content mode options', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: [
      'edit-page',
      'doc-1',
      'page-1',
      '--sub-title',
      'Refined',
      '--content',
      'delta',
      '--content-edit-mode',
      'append',
      '--content-format',
      'text/plain',
    ],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      assert.equal(url, 'https://api.clickup.com/api/v3/workspaces/workspace-1/docs/doc-1/pages/page-1');
      assert.deepEqual(JSON.parse(options.body), {
        content: 'delta',
        sub_title: 'Refined',
        content_edit_mode: 'append',
        content_format: 'text/plain',
      });

      return new Response(JSON.stringify({ id: 'page-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Page updated successfully/);
  assert.equal(stderr.toString(), '');
});

test('runCli uses content_format when fetching a page', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['page', 'doc-1', 'page-1', '--content-format', 'text/plain'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url) => {
      const parsedUrl = new URL(url);
      assert.equal(parsedUrl.pathname, '/api/v3/workspaces/workspace-1/docs/doc-1/pages/page-1');
      assert.equal(parsedUrl.searchParams.get('content_format'), 'text/plain');

      return new Response(JSON.stringify({
        id: 'page-1',
        name: 'Overview',
        content: 'plain text',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Page: Overview/);
  assert.equal(stderr.toString(), '');
});

test('runCli shows doc pages when page_listing returns an array', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['doc', 'doc-1'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url) => {
      const parsedUrl = new URL(url);

      if (parsedUrl.pathname === '/api/v3/workspaces/workspace-1/docs/doc-1') {
        return new Response(JSON.stringify({
          id: 'doc-1',
          name: 'Project Notes',
          workspace_id: 'workspace-1',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (parsedUrl.pathname === '/api/v3/workspaces/workspace-1/docs/doc-1/page_listing') {
        return new Response(JSON.stringify([
          {
            id: 'page-1',
            name: 'Overview',
          },
        ]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Project Notes/);
  assert.match(stdout.toString(), /Overview/);
  assert.equal(stderr.toString(), '');
});
