const test = require('node:test');
const assert = require('node:assert/strict');
const { readJsonBody } = require('../lib/http/json');

test('readJsonBody rejects oversized direct string bodies', async () => {
  await assert.rejects(() => readJsonBody({
    headers: {},
    body: JSON.stringify({ value: 'too large' }),
  }, { maxBytes: 4 }), /Request payload is too large/);
});

test('readJsonBody rejects oversized direct buffer bodies', async () => {
  await assert.rejects(() => readJsonBody({
    headers: {},
    body: Buffer.from(JSON.stringify({ value: 'too large' })),
  }, { maxBytes: 4 }), /Request payload is too large/);
});
