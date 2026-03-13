import test from 'node:test';
import assert from 'node:assert/strict';

import { createDocService } from '../src/services/doc-service.mjs';

function createDocServiceFixture({ requestV3 } = {}) {
  return createDocService({
    client: {
      requestV3,
    },
    userService: {
      getWorkspaceId: async () => 'workspace-1',
    },
  });
}

test('searchDocs paginates through all doc pages', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);

      if (path === '/workspaces/workspace-1/docs?limit=100') {
        return {
          docs: [
            { id: 'doc-1', name: 'Alpha' },
            { id: 'doc-2', name: 'Beta' },
          ],
          next_cursor: 'cursor-1',
        };
      }

      if (path === '/workspaces/workspace-1/docs?limit=100&next_cursor=cursor-1') {
        return {
          docs: [
            { id: 'doc-3', name: 'Gamma' },
          ],
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const docs = await service.searchDocs();
  assert.deepEqual(docs.map((doc) => doc.id), ['doc-1', 'doc-2', 'doc-3']);
  assert.deepEqual(calls, [
    '/workspaces/workspace-1/docs?limit=100',
    '/workspaces/workspace-1/docs?limit=100&next_cursor=cursor-1',
  ]);
});

test('searchDocs filters by doc name locally instead of sending query to the API', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);

      if (path === '/workspaces/workspace-1/docs?limit=100') {
        return {
          docs: [
            { id: 'doc-1', name: 'Alpha' },
          ],
          next_cursor: 'cursor-1',
        };
      }

      if (path === '/workspaces/workspace-1/docs?limit=100&next_cursor=cursor-1') {
        return {
          docs: [
            { id: 'doc-2', name: 'Sprint1 2026/03/02-2026/03/14' },
            { id: 'doc-3', name: 'Sprint2 2026/03/15-2026/03/28' },
          ],
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const docs = await service.searchDocs({ query: 'sprint1 2026/03/02-2026/03/14' });
  assert.deepEqual(docs, [
    { id: 'doc-2', name: 'Sprint1 2026/03/02-2026/03/14' },
  ]);
  assert.deepEqual(calls, [
    '/workspaces/workspace-1/docs?limit=100',
    '/workspaces/workspace-1/docs?limit=100&next_cursor=cursor-1',
  ]);
});

test('searchDocs forwards documented server-side filters', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);
      return { docs: [] };
    },
  });

  await service.searchDocs({
    id: 'doc-9',
    creator: 'user-1',
    deleted: true,
    archived: true,
    parentId: 'parent-1',
    parentType: 'FOLDER',
    limit: 25,
  });

  assert.deepEqual(calls, [
    '/workspaces/workspace-1/docs?limit=25&id=doc-9&creator=user-1&deleted=true&archived=true&parent_id=parent-1&parent_type=FOLDER',
  ]);
});

test('getDocPageListing uses the documented endpoint and accepts array responses', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);

      if (path === '/workspaces/workspace-1/docs/doc-1/page_listing') {
        return [
          { id: 'page-1', name: 'Overview' },
        ];
      }

      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const pages = await service.getDocPageListing('doc-1');
  assert.deepEqual(pages, [{ id: 'page-1', name: 'Overview' }]);
  assert.deepEqual(calls, ['/workspaces/workspace-1/docs/doc-1/page_listing']);
});

test('getDocPageListing forwards max_page_depth', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);
      return [];
    },
  });

  await service.getDocPageListing('doc-1', { maxPageDepth: 2 });
  assert.deepEqual(calls, [
    '/workspaces/workspace-1/docs/doc-1/page_listing?max_page_depth=2',
  ]);
});

test('getPage sends content_format as a query parameter', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path) => {
      calls.push(path);
      return { id: 'page-1', name: 'Overview', content: 'plain text' };
    },
  });

  const page = await service.getPage('doc-1', 'page-1', 'text/plain');
  assert.equal(page.id, 'page-1');
  assert.deepEqual(calls, [
    '/workspaces/workspace-1/docs/doc-1/pages/page-1?content_format=text%2Fplain',
  ]);
});

test('createPage forwards parent_page_id, sub_title, and content_format', async () => {
  let body = null;
  const service = createDocServiceFixture({
    requestV3: async (_path, options = {}) => {
      body = options.body;
      return { id: 'page-1', name: 'Overview' };
    },
  });

  await service.createPage('doc-1', 'Overview', {
    content: '# Hello',
    contentFormat: 'text/plain',
    parentPageId: 'parent-1',
    subTitle: 'Subheading',
  });

  assert.deepEqual(body, {
    name: 'Overview',
    content: '# Hello',
    content_format: 'text/plain',
    parent_page_id: 'parent-1',
    sub_title: 'Subheading',
  });
});

test('editPage forwards sub_title, content_edit_mode, and content_format', async () => {
  let body = null;
  const service = createDocServiceFixture({
    requestV3: async (_path, options = {}) => {
      body = options.body;
      return { id: 'page-1' };
    },
  });

  await service.editPage('doc-1', 'page-1', {
    subTitle: 'Refined',
    content: 'delta',
    contentEditMode: 'append',
    contentFormat: 'text/plain',
  });

  assert.deepEqual(body, {
    content: 'delta',
    sub_title: 'Refined',
    content_edit_mode: 'append',
    content_format: 'text/plain',
  });
});

test('createDoc populates the first page when content is provided', async () => {
  const calls = [];
  const service = createDocServiceFixture({
    requestV3: async (path, options = {}) => {
      calls.push({ path, options });

      if (path === '/workspaces/workspace-1/docs' && options.method === 'POST') {
        return { id: 'doc-1', name: 'Project Notes' };
      }

      if (path === '/workspaces/workspace-1/docs/doc-1/page_listing') {
        return [
          { id: 'page-1', name: 'Project Notes' },
        ];
      }

      if (path === '/workspaces/workspace-1/docs/doc-1/pages/page-1' && options.method === 'PUT') {
        return { id: 'page-1' };
      }

      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const doc = await service.createDoc('Project Notes', { content: '# Seed' });
  assert.deepEqual(doc, {
    id: 'doc-1',
    name: 'Project Notes',
    firstPageId: 'page-1',
  });
  assert.deepEqual(calls.map((call) => call.path), [
    '/workspaces/workspace-1/docs',
    '/workspaces/workspace-1/docs/doc-1/page_listing',
    '/workspaces/workspace-1/docs/doc-1/pages/page-1',
  ]);
  assert.deepEqual(calls[2].options.body, { content: '# Seed' });
});
