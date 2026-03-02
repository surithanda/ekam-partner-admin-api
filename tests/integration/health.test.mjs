import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Stub DB before requiring app
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };

const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);

describe('Health & Error Handling Integration', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request.get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.includes('running'));
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request.get('/api/nonexistent');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });
});
