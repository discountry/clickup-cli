import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDocId,
  parseListId,
  parsePageId,
  parseTaskId,
} from '../src/utils/id-parsers.mjs';

test('parseTaskId supports task ids and URLs', () => {
  assert.equal(parseTaskId('86a1b2c3d'), '86a1b2c3d');
  assert.equal(
    parseTaskId('https://app.clickup.com/t/86a1b2c3d'),
    '86a1b2c3d'
  );
  assert.equal(
    parseTaskId('https://app.clickup.com/123/v/li/456?p=86a1b2c3d'),
    '86a1b2c3d'
  );
});

test('parseListId supports bare ids and list URLs', () => {
  assert.equal(parseListId('901111220963'), '901111220963');
  assert.equal(
    parseListId('https://app.clickup.com/123/v/li/901111220963'),
    '901111220963'
  );
  assert.equal(parseListId('not-a-list'), null);
});

test('parseDocId and parsePageId support doc URLs', () => {
  assert.equal(parseDocId('abc123'), 'abc123');
  assert.equal(
    parseDocId('https://app.clickup.com/123/v/dc/abc123'),
    'abc123'
  );
  assert.equal(
    parseDocId('https://doc.clickup.com/d/h/abc123/hash456/page789'),
    'abc123'
  );
  assert.equal(
    parsePageId('https://app.clickup.com/123/docs/abc123?page=page456'),
    'page456'
  );
  assert.equal(
    parsePageId('https://app.clickup.com/123/v/dc/abc123/page456'),
    'page456'
  );
  assert.equal(
    parsePageId('https://doc.clickup.com/d/h/abc123/hash456/page789'),
    'page789'
  );
});
