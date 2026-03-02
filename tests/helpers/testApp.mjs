/**
 * JWT token generator for integration tests.
 */
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = '*';

export function generateToken(payload = {}) {
  const defaults = {
    userId: 1,
    username: 'partneradmin',
    role: 'partner-admin',
    partnerId: 1,
    apiClientId: 1,
    partnerName: 'Ekam Matrimony',
    firstName: 'Partner',
    lastName: 'Admin'
  };
  return jwt.sign({ ...defaults, ...payload }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
