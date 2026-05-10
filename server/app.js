import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { google } from 'googleapis';
import { env } from './shared/env.js';
import { httpLogger, logger } from './shared/logger.js';
import { getBearerToken, signScanToken, verifyScanToken } from './shared/auth.js';
import { initSse, sseError } from './shared/sse.js';
import { ensureSchema, getUserById, saveGoogleTokens, upsertUser } from './db.js';
import {
  bindWorkerLogs,
  createParserWorker,
  readIcloudSession,
  storeIcloudSession,
} from './queue.js';
import { runGmailScan } from './services/gmailScan.js';
import { runIcloudScan, validateIcloudCredentials } from './services/icloudScan.js';

let inlineWorker = null;

export async function createApp() {
  await ensureSchema();

  if (env.INLINE_WORKER) {
    inlineWorker = createParserWorker();
    bindWorkerLogs(inlineWorker);
    logger.info('Inline queue worker started');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(httpLogger);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'skyhistory-api',
      inlineWorker: env.INLINE_WORKER,
    });
  });

  app.get('/api/auth/google', (req, res) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.status(500).json({
        error: 'Google OAuth is not configured',
        requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      });
      return;
    }

    const next = sanitizeNext(req.query.next);
    const state = Buffer.from(JSON.stringify({ next })).toString('base64url');
    const oauth2 = createGoogleClient();

    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'],
      state,
    });
    res.redirect(url);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const state = parseState(req.query.state);
    const next = sanitizeNext(state?.next);

    try {
      const code = String(req.query.code || '');
      if (!code) throw new Error('Missing OAuth code');

      const oauth2 = createGoogleClient();
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);

      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
      const me = await oauth2Api.userinfo.get();
      const email = me.data.email;
      if (!email) throw new Error('Google did not return email');

      const user = await upsertUser({
        email,
        displayName: me.data.name || email.split('@')[0],
        authType: 'gmail',
      });
      await saveGoogleTokens(user.id, tokens);

      const scanToken = signScanToken({
        sub: user.id,
        source: 'gmail',
      });

      res.redirect(
        withParams(next, {
          oauth: 'ok',
          source: 'gmail',
          email: user.email,
          name: user.displayName || '',
          scanToken,
        }),
      );
    } catch (error) {
      logger.error({ err: error }, 'google oauth callback failed');
      res.redirect(withParams(next, { oauth: 'error', reason: 'google_auth_failed' }));
    }
  });

  app.post('/api/icloud/session', async (req, res) => {
    try {
      const { email, appPassword, server } = req.body || {};
      if (!email || !appPassword) {
        res.status(400).json({ error: 'email and appPassword are required' });
        return;
      }

      await validateIcloudCredentials({ email, appPassword, server });
      const user = await upsertUser({
        email,
        displayName: String(email).split('@')[0],
        authType: 'icloud',
      });

      const sessionKey = await storeIcloudSession({
        email,
        appPassword,
        server,
        userId: user.id,
      });
      const scanToken = signScanToken({
        sub: user.id,
        source: 'icloud',
        sessionKey,
      });

      res.json({
        ok: true,
        account: {
          email: user.email,
          name: user.displayName,
          scanToken,
        },
      });
    } catch (error) {
      logger.warn({ err: error }, 'icloud session validation failed');
      res.status(401).json({ error: 'Unable to connect to iCloud IMAP with provided credentials' });
    }
  });

  app.get('/api/gmail/scan', async (req, res) => {
    initSse(res);
    try {
      const token = getBearerToken(req) || String(req.query.scanToken || '');
      const auth = verifyScanToken(token);
      if (auth.source !== 'gmail') throw new Error('Invalid token source');
      const user = await getUserById(auth.sub);
      if (!user) throw new Error('User not found');

      await runGmailScan({ userId: user.id, req, res });
      res.end();
    } catch (error) {
      logger.error({ err: error }, 'gmail scan failed');
      sseError(res, error.message || 'Gmail scan failed');
      res.end();
    }
  });

  app.get('/api/icloud/scan', async (req, res) => {
    initSse(res);
    try {
      const token = getBearerToken(req) || String(req.query.scanToken || '');
      const auth = verifyScanToken(token);
      if (auth.source !== 'icloud') throw new Error('Invalid token source');
      const user = await getUserById(auth.sub);
      if (!user) throw new Error('User not found');

      const session = await readIcloudSession(auth.sessionKey);
      if (!session) throw new Error('iCloud session expired, reconnect required');
      await runIcloudScan({ userId: user.id, req, res, session });
      res.end();
    } catch (error) {
      logger.error({ err: error }, 'icloud scan failed');
      sseError(res, error.message || 'iCloud scan failed');
      res.end();
    }
  });

  app.use((error, _req, res, _next) => {
    logger.error({ err: error }, 'Unhandled API error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function createGoogleClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

function parseState(rawState) {
  if (!rawState || typeof rawState !== 'string') return null;
  try {
    return JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function sanitizeNext(value) {
  const fallback = `${env.FRONTEND_ORIGIN}/`;
  if (!value || typeof value !== 'string') return fallback;
  try {
    const nextUrl = new URL(value);
    const allowed = new Set(env.CORS_ORIGINS);
    if (!allowed.has(nextUrl.origin)) return fallback;
    return nextUrl.toString();
  } catch {
    return fallback;
  }
}

function withParams(url, params) {
  const next = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    next.searchParams.set(k, String(v));
  }
  return next.toString();
}
