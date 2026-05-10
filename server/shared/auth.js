import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function signScanToken(payload) {
  return jwt.sign(payload, env.APP_JWT_SECRET, { expiresIn: '30m' });
}

export function verifyScanToken(raw) {
  if (!raw) throw new Error('Missing scan token');
  try {
    return jwt.verify(raw, env.APP_JWT_SECRET);
  } catch {
    throw new Error('Invalid or expired scan token');
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}
