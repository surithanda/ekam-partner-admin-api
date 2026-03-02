/**
 * Factory helpers to build mock Express req/res objects using sinon stubs.
 */
import sinon from 'sinon';

export function mockReq(overrides = {}) {
  return {
    body: {},
    headers: { 'user-agent': 'node-test' },
    user: {
      userId: 1,
      username: 'partneradmin',
      role: 'partner-admin',
      partnerId: 1,
      apiClientId: 1,
      partnerName: 'Ekam Matrimony',
      firstName: 'Partner',
      lastName: 'Admin'
    },
    ip: '127.0.0.1',
    originalUrl: '/api/test',
    ...overrides
  };
}

export function mockRes() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
}

export function mockNext() {
  return sinon.stub();
}
