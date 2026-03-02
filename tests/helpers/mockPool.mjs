/**
 * Mock DB pool for ADO tests.
 * Uses sinon stubs so each test can configure query responses.
 */
import sinon from 'sinon';

const pool = {
  query: sinon.stub()
};

export function resetPool() {
  pool.query.reset();
}

export default pool;
